const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mercadopago = require('mercadopago');
const services = require('./services');
require('dotenv').config();

mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
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
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

// Palavras para saudação (inclui emoji e variantes)
const SAUDACOES = [
  'oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', '.', '👋', '👍'
];

const CONFIRMACOES = [
  'sim', 'confirmo', 'confirmar', 'confirma', 'quero', 'quero sim', 'quero confirmar', 'ok', 'pode ser'
];

const NEGACOES = [
  'nao', 'não', 'cancelar', 'desistir', 'n', 'não quero', 'nao quero', 'não confirmo', 'nao confirmo'
];

// ============================
// Inicialização do WhatsApp
// ============================
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ['--no-sandbox'] }
});

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

  // Cria estado do cliente se não existir
  if (!clientes[id]) {
    clientes[id] = {
      saudou: false,
      esperandoConfirmacao: false,
      pedido: null,
      arquivoRecebido: false
    };
  }
  const estado = clientes[id];

  // Evita saudação duplicada: só responde uma vez por conversa
  if (
    !estado.saudou &&
    (SAUDACOES.includes(texto) || texto === '' || texto.match(/^[\p{Emoji}\s]+$/u))
    && !estado.esperandoConfirmacao
    && !estado.pedido
  ) {
    estado.saudou = true;
    await msg.reply(formatarMensagemBonita(
      `Bem-vindo(a) à ${DADOS_LOJA.nome}!`,
      `✨ Imprimimos, digitalizamos, fazemos foto 3x4, contratos, muito mais, sempre com rapidez e preço justo.\n\n` +
      `📍 Endereço: ${DADOS_LOJA.endereco}\n🕗 Horário: ${DADOS_LOJA.horario}\n\n` +
      `💡 Diga o serviço que você deseja: xerox, impressão, foto 3x4, digitalização, contrato de locação, contrato de compra e venda, etc.`
    ));
    return;
  }

  // Arquivo recebido: só responde na primeira vez
  if (msg.hasMedia && !estado.arquivoRecebido) {
    estado.arquivoRecebido = true;
    await msg.reply('📄 Arquivo recebido! Aguardo suas instruções para continuar o atendimento.');
    return;
  }
  if (msg.hasMedia && estado.arquivoRecebido) return;

  // Identifica pedido e orçamento (não entra nesse bloco se já tem pedido pendente)
  if (!estado.esperandoConfirmacao && !estado.pedido) {
    const servico = identificarServicoCurto(texto);
    if (servico) {
      estado.pedido = { nome: servico.nome, preco: servico.precoPadrao };
      estado.esperandoConfirmacao = true;
      await msg.reply(`💰 Orçamento para *${servico.nome}*: R$${servico.precoPadrao.toFixed(2)}. Deseja confirmar o pedido? (sim/não)`);
      return;
    }
    if (textoOriginal.endsWith('?')) {
      await msg.reply('❓ Pode perguntar! Estou aqui para ajudar com os serviços da Ce Cópias.');
      return;
    }
    await msg.reply('🤔 Não entendi. Diga o serviço que você quer: xerox, impressão, foto 3x4, contrato de locação, etc.');
    return;
  }

  // Lida com confirmação inteligente (aceita várias palavras de confirmação)
  if (estado.esperandoConfirmacao && estado.pedido) {
    if (CONFIRMACOES.some(c => texto.includes(c))) {
      estado.esperandoConfirmacao = false;

      // PERGUNTA qual forma de pagamento
      await msg.reply(
        `✅ Pedido confirmado!\n\nComo você prefere pagar?\n\n1️⃣ Cartão (Mercado Pago)\n2️⃣ PIX\n\nResponda: *cartão* ou *pix*`
      );
      estado.aguardandoPagamento = true;
      return;
    }
    if (NEGACOES.some(n => texto.includes(n))) {
      estado.esperandoConfirmacao = false;
      estado.pedido = null;
      await msg.reply('Pedido cancelado. Se precisar, é só chamar!');
      return;
    }
    await msg.reply('Por favor, responda "sim" para confirmar ou "não" para cancelar o pedido.');
    return;
  }

  // Escolha da forma de pagamento (após confirmação do pedido)
  if (estado.aguardandoPagamento && estado.pedido) {
    if (texto.includes("cartao") || texto.includes("cartão")) {
      estado.aguardandoPagamento = false;
      const linkMP = await gerarLinkPagamento(id, estado.pedido.preco, estado.pedido.nome);
      await msg.reply(
        `💳 Pagamento via Cartão de Crédito/Débito:\n\n1️⃣ Clique no link abaixo para pagar com Mercado Pago (cartão de crédito ou débito, pode usar qualquer banco):\n${linkMP}\n\nAssim que recebermos o pagamento, começamos o serviço.`
      );
      await msg.reply(
        `Se preferir, também aceitamos *PIX*!\nChave PIX: ${DADOS_LOJA.pix}\n\nQuando fizer o PIX, envie o comprovante.`
      );
      // Limpa o pedido após enviar os métodos
      estado.pedido = null;
      return;
    }
    if (texto.includes("pix")) {
      estado.aguardandoPagamento = false;
      await msg.reply(
        `🔑 Pagamento via PIX:\n\nChave PIX: ${DADOS_LOJA.pix}\n\nAssim que recebermos o comprovante, começamos o serviço.\n\nSe quiser pagar no cartão de crédito ou débito, é só responder "cartão".`
      );
      // Limpa o pedido após enviar os métodos
      estado.pedido = null;
      return;
    }
    await msg.reply(
      `Por favor, responda *cartão* para pagar com Mercado Pago ou *pix* para pagar via PIX.`
    );
    return;
  }
});

client.initialize();
