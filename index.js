// index.js

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mercadopago = require('mercadopago');
const services = require('./services'); // Sua lista de serviços
require('dotenv').config();

mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ['--no-sandbox'] }
});

const DADOS_LOJA = {
  nome: 'Ce Cópias',
  endereco: 'Rua General Sampaio, Nº 835 - Shopping Central, Fortaleza - CE',
  horario: 'Segunda a Sexta: 8:30 às 17:00\nSábado e Domingo: Fechado',
  pix: 'mikle413@hotmail.com',
  instagram: 'https://www.instagram.com/ce_copias/'
};

const clientes = {};

function formatarMensagemBonita(titulo, corpo, rodape = '') {
  return `✨ *${titulo}*\n\n${corpo}${rodape ? '\n\n' + rodape : ''}`;
}

function normalizarTexto(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function identificarServicoCurto(texto) {
  texto = normalizarTexto(texto);
  for (const servico of services.impressoes) {
    if (servico.aliases.some(alias => texto.includes(normalizarTexto(alias)))) {
      return servico;
    }
  }
  return null;
}

async function gerarLinkPagamento(clienteId, valor, descricao) {
  try {
    const preference = {
      items: [{ title: descricao, quantity: 1, unit_price: valor }],
      external_reference: clienteId,
      payment_methods: { excluded_payment_types: [{ id: "ticket" }] },
      back_urls: {
        success: `https://api.whatsapp.com/send?phone=${clienteId.replace("@c.us","")}`,
        failure: `https://api.whatsapp.com/send?phone=${clienteId.replace("@c.us","")}`,
        pending: `https://api.whatsapp.com/send?phone=${clienteId.replace("@c.us","")}`
      },
      auto_return: "approved"
    };
    const response = await mercadopago.preferences.create(preference);
    return response.body.init_point;
  } catch (err) {
    console.error("Erro ao gerar link Mercado Pago:", err);
    return null;
  }
}

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('Escaneie o QR code acima para conectar o WhatsApp.');
});

client.on('ready', () => {
  console.log('Bot Ce Cópias está online!');
});

client.on('message', async msg => {
  const id = msg.from;
  const textoOriginal = msg.body?.trim() || '';
  const texto = normalizarTexto(textoOriginal);

  if (!clientes[id]) {
    clientes[id] = {
      saudou: false,
      esperandoConfirmacao: false,
      pedido: null,
      arquivoRecebido: false
    };
  }

  const estado = clientes[id];

  // 1. Saudações e mensagens iniciais, aceita emojis, "." etc.
  const saudações = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', '.', '👋', '👍'];
  if (!estado.saudou && (saudações.includes(texto) || texto === '' || texto.match(/^[\p{Emoji}\s]+$/u))) {
    estado.saudou = true;
    await msg.reply(formatarMensagemBonita(
      `Bem-vindo(a) à ${DADOS_LOJA.nome}!`,
      `✨ Imprimimos, digitalizamos, fazemos foto 3x4 e muito mais, sempre com rapidez e preço justo.\n\n` +
      `📍 Endereço: ${DADOS_LOJA.endereco}\n🕗 Horário: ${DADOS_LOJA.horario}\n\n` +
      `💡 Me diga se deseja xerox, impressão, foto 3x4 ou digitalização.`
    ));
    return;
  }

  // 8. Arquivo recebido: responde só uma vez
  if (msg.hasMedia && !estado.arquivoRecebido) {
    estado.arquivoRecebido = true;
    await msg.reply('📄 Arquivo recebido! Aguardo suas instruções para continuar o atendimento.');
    return;
  }
  if (msg.hasMedia && estado.arquivoRecebido) {
    // Ignora novos arquivos sem instrução para evitar spam
    return;
  }

  // 2 e 3. Identificar pedido e orçamento
  if (!estado.esperandoConfirmacao) {
    const servico = identificarServicoCurto(texto);
    if (servico) {
      estado.pedido = { nome: servico.nome, preco: servico.precoPadrao };
      estado.esperandoConfirmacao = true;
      await msg.reply(`💰 Orçamento para *${servico.nome}*: R$${servico.precoPadrao.toFixed(2)}. Deseja confirmar o pedido? (sim/não)`);
      return;
    }

    // 6. Responder dúvidas simples
    if (textoOriginal.endsWith('?')) {
      await msg.reply('❓ Pode perguntar! Estou aqui para ajudar com os serviços da Ce Cópias.');
      return;
    }

    // Mensagem não entendida
    await msg.reply('🤔 Não entendi. Por favor, diga se deseja xerox, foto 3x4, impressão, digitalização ou outra coisa.');
    return;
  }

  // 4 e 5. Confirmar pedido e enviar pagamento
  if (estado.esperandoConfirmacao) {
    if (/^(sim|quero|confirmo|ok|pode ser)$/.test(texto)) {
      estado.esperandoConfirmacao = false;

      const linkMP = await gerarLinkPagamento(id, estado.pedido.preco, estado.pedido.nome);
      let msgPagamento = `Pedido confirmado!\n\n💳 Formas de pagamento:\n`;
      if (linkMP) msgPagamento += `1️⃣ Mercado Pago: ${linkMP}\n`;
      msgPagamento += `2️⃣ PIX: ${DADOS_LOJA.pix}\n\nAssim que recebermos o pagamento, começamos o serviço.`;

      await msg.reply(msgPagamento);
      return;
    } else if (/^(não|nao|cancelar|desistir)$/.test(texto)) {
      estado.esperandoConfirmacao = false;
      estado.pedido = null;
      await msg.reply('Pedido cancelado. Se precisar, é só chamar!');
      return;
    } else {
      await msg.reply('Por favor, responda "sim" para confirmar ou "não" para cancelar o pedido.');
      return;
    }
  }
});

client.initialize();
