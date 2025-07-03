// =========== IMPORTS PRINCIPAIS ===========
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { OpenAI } = require('openai');
const services = require('./services'); // Certifique-se que services.js exporta os serviços
require('dotenv').config();

const mercadopago = require('mercadopago');
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

// =========== CONFIGURAÇÃO OPENAI ===========
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_MODEL = 'gpt-4o';

// =========== CLIENTE WHATSAPP ===========
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// =========== DADOS DA LOJA ===========
const DADOS_LOJA = {
  nome: 'Ce Cópias',
  horario: 'Segunda a Sexta: 8:30 às 17:00\nSábado e Domingo: Fechado',
  endereco: 'Rua General Sampaio, Nº 835 - Shopping Central, Fortaleza - CE (em frente ao Vapt Vupt Centro)',
  pix: 'mikle413@hotmail.com',
  instagram: 'https://www.instagram.com/ce_copias/'
};

// =========== CONTROLE DE CLIENTES ===========
const clienteStatus = {};
const clienteHistorico = {};
const TIMEOUT_EXPIRACAO = 3 * 60 * 1000; // 3 minutos
const TEMPO_PERSISTENCIA_ESTADO = 15 * 60 * 1000; // 15 minutos

// =========== FUNÇÕES DE SUPORTE ===========
function resetarCliente(clienteId, forcarTotal = false) {
  if (forcarTotal) {
    delete clienteStatus[clienteId];
    delete clienteHistorico[clienteId];
    console.log(`Estado do cliente ${clienteId} resetado (total).`);
  } else {
    if (!clienteStatus[clienteId]) clienteStatus[clienteId] = {};
    clienteStatus[clienteId].inativo = true;
    setTimeout(() => {
      if (clienteStatus[clienteId]?.inativo) {
        delete clienteStatus[clienteId];
        delete clienteHistorico[clienteId];
        console.log(`Estado do cliente ${clienteId} expurgado após 15 minutos inativo.`);
      }
    }, TEMPO_PERSISTENCIA_ESTADO);
  }
}

function mensagemEhVenda(texto) {
  texto = texto.toLowerCase();
  return [
    "impressão", "impressao", "imprimir", "xerox", "digitalização", "digitalizacao",
    "foto 3x4", "foto3x4", "plastificação", "plastificacao", "encadernação", "encadernacao",
    "preto e branco", "colorida", "colorido", "cópia", "copia", "página", "pagina",
    "cópias", "copias", "quantidade", "pedido", "pagar", "comprar", "boleto", "tirar boleto"
  ].some(palavra => texto.includes(palavra));
}

function identificarServicoCurto(texto) {
  texto = texto.toLowerCase();
  for (const servico of services.impressoes) {
    if (servico.aliases.some(alias => texto.includes(alias.toLowerCase()))) return servico;
  }
  if (texto.includes('tirar boleto') || texto.includes('boleto')) {
    return { nome: "Tirar Boleto", precoPadrao: 5.00, aliases: ["tirar boleto", "boleto"] };
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
        success: "https://api.whatsapp.com/send?phone=" + clienteId.replace("@c.us", ""),
        failure: "https://api.whatsapp.com/send?phone=" + clienteId.replace("@c.us", ""),
        pending: "https://api.whatsapp.com/send?phone=" + clienteId.replace("@c.us", "")
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

function formatarMensagemBonita(titulo, corpo, rodape = '') {
  return `✨ *${titulo}*\n\n${corpo}${rodape ? '\n\n' + rodape : ''}`;
}

// =========== OPENAI: DETECÇÃO DE INTENÇÃO ===========
async function detectarIntencaoComOpenAI(clienteId, textoNovo = '') {
  const historico = clienteHistorico[clienteId] || [];
  const contexto = `
Você é um atendente de uma loja de impressão chamada ${DADOS_LOJA.nome}.
Horário: ${DADOS_LOJA.horario}.
Endereço: ${DADOS_LOJA.endereco}.
PIX: ${DADOS_LOJA.pix}
Instagram: ${DADOS_LOJA.instagram}.

Serviços: impressão, xerox, foto 3x4, digitalização, etc.

Cliente enviou as seguintes mensagens na sessão:
${historico.slice(-15).map(m => `- ${m}`).join('\n')}

Mensagem mais recente:
"${textoNovo}"

Diga qual a real intenção do cliente. Se for atendimento presencial, só avise "presencial".
Se for arquivo aguardando resposta, avise "aguardando". Se for venda, orçamento, dúvida, pagamento, confirmação, etc, responda com uma das palavras:
- saudacao, venda, pagamento, agendamento, comprovante, duvida, cancelar, confirmacao, presencial, aguardando, finalizado, outro
Se não souber, responda "outro".
Retorne só a palavra da intenção, nada mais.
`;
  try {
    const resposta = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: contexto }]
    });
    return resposta.choices[0].message.content.trim().toLowerCase();
  } catch (e) {
    console.error("Erro OpenAI intenção:", e?.message || e);
    return 'outro';
  }
}

// =========== TIMER ARQUIVO ===========
async function iniciarTimerArquivo(message, clienteId) {
  const status = clienteStatus[clienteId];
  if (!status) return;
  if (status.timerArquivo) clearTimeout(status.timerArquivo);

  status.timerArquivo = setTimeout(async () => {
    const intencao = await detectarIntencaoComOpenAI(clienteId, '(timeout arquivo)');
    if (
      intencao === 'presencial' ||
      intencao === 'finalizado' ||
      intencao === 'confirmacao'
    ) return;
    const corpo = `⚠️ Seu pedido está quase pronto, mas preciso saber como continuar. Se quiser agendar para amanhã ou retirar depois, é só pagar agora e deixamos tudo pronto pra você!`;
    const rodape = `\n\n💸 *Pagamento antecipado garante o seu pedido pronto na hora!*\n\nPague via Mercado Pago ou envie comprovante do PIX:\nPIX: ${DADOS_LOJA.pix}`;
    await message.reply(formatarMensagemBonita('Pedido Pendente', corpo, rodape));
    status.timerArquivo = null;
  }, TIMEOUT_EXPIRACAO);
}

// =========== TIMER ATENDIMENTO PRESENCIAL ===========
async function iniciarTimerPresencialArquivo(message, clienteId) {
  const status = clienteStatus[clienteId];
  if (!status) return;
  if (status.timerPresencialArquivo) clearTimeout(status.timerPresencialArquivo);

  status.timerPresencialArquivo = setTimeout(async () => {
    const aviso = `⏰ *Atenção!*
Não recebemos nenhuma resposta sua nos últimos minutos. Por isso, o atendimento será *cancelado* para liberar a fila.

Se quiser garantir seu pedido pronto para retirada, basta agendar e *efetuar o pagamento* agora mesmo! Assim que for confirmado, seu pedido será executado o mais rápido possível. 😉

💡 *Dica:* Para agendar, é só responder aqui e realizar o pagamento antecipado por PIX ou solicitar o link Mercado Pago!

Qualquer dúvida ou necessidade, pode chamar! Estou aqui para te ajudar. 📲`;

    await message.reply(aviso);
    resetarCliente(clienteId, true);
  }, 5 * 60 * 1000);
}

// =========== EVENTOS ===========
client.on('qr', (qr) => {
  try {
    qrcode.generate(qr, { small: true });
    console.log('\n\n📱 *Abra o app do WhatsApp, toque em Dispositivos Conectados > Conectar Novo*');
    console.log('Ou escaneie o QR acima direto pelo app.\n');
  } catch (e) {
    console.log('❌ Falha ao exibir QR code no terminal.');
  }
});

client.on('ready', () => {
  console.log('Ce Copias Assistente da Loja está ONLINE!');
});

client.on('message', async (message) => {
  if (message.from.endsWith('@g.us')) return;

  const clienteId = message.from;
  let texto = message.body?.trim() || "";

  if (!clienteHistorico[clienteId]) clienteHistorico[clienteId] = [];
  if (texto) clienteHistorico[clienteId].push(texto);
  if (clienteHistorico[clienteId].length > 25) clienteHistorico[clienteId].shift();

  if (!clienteStatus[clienteId]) clienteStatus[clienteId] = {};
  const status = clienteStatus[clienteId];

  if (status.inativo) status.inativo = false;

  const primeiraInteracao = !status.primeiraInteracaoConcluida;
  const isGreeting = /^(oi|olá|ola|bom dia|boa tarde|boa noite|\.)$/i.test(texto);

  if (primeiraInteracao && isGreeting) {
    status.primeiraInteracaoConcluida = true;
    status.saudacaoEnviada = true;
    const msg = formatarMensagemBonita(
      `Bem-vindo(a) à ${DADOS_LOJA.nome}!`,
      `✨ Imprimimos, digitalizamos, fazemos foto 3x4 e muito mais, sempre com rapidez e preço justo.\n\n` +
      `📍 *Endereço:* ${DADOS_LOJA.endereco}\n🕗 *Horário:* ${DADOS_LOJA.horario}\n\n` +
      `💡 Salve nosso número e indique para amigos!\n🔗 [Siga no Instagram](${DADOS_LOJA.instagram}) 😉`
    );
    await message.reply(msg);
    status.ultimoEvento = Date.now();
    return;
  }

  const intencao = await detectarIntencaoComOpenAI(clienteId, texto);

  if (intencao === 'presencial' || status.modoPresencial) {
    status.ultimoEvento = Date.now();
    return;
  }

  if (intencao === 'venda' || mensagemEhVenda(texto)) {
    const servico = identificarServicoCurto(texto);
    if (servico) {
      await message.reply(formatarMensagemBonita(
        'Orçamento',
        `Serviço: *${servico.nome}*\nPreço: R$ ${servico.precoPadrao.toFixed(2)}\n\nDeseja fechar o pedido?`
      ));
      status.ultimoEvento = Date.now();
      return;
    }
  }

  if (["sim", "confirmo", "quero", "fechar", "confirmar", "pode ser", "ok"].includes(texto.toLowerCase()) || intencao === 'confirmacao') {
    await message.reply(formatarMensagemBonita(
      'Pedido Confirmado!',
      `Seu pedido está reservado.\n\n💳 Formas de Pagamento:\n1️⃣ Mercado Pago: (link gerado na hora)\n2️⃣ PIX: ${DADOS_LOJA.pix}\n\nAssim que o pagamento for confirmado, começamos o serviço!`
    ));
    status.ultimoEvento = Date.now();
    return;
  }

  if (intencao === 'pagamento' || intencao === 'agendamento') {
    await message.reply(formatarMensagemBonita(
      'Pagamento e Agendamento',
      `💡 Para agendar ou garantir seu pedido pronto para amanhã, basta pagar agora!\n\nPIX: ${DADOS_LOJA.pix}\nOu solicite o link Mercado Pago.`
    ));
    status.ultimoEvento = Date.now();
    return;
  }

  if (intencao === 'duvida' || texto.endsWith('?')) {
    await message.reply(formatarMensagemBonita(
      'Dúvida',
      `Pode perguntar! Estou aqui para te ajudar com qualquer serviço ou informação sobre a loja.`
    ));
    status.ultimoEvento = Date.now();
    return;
  }

  if (["cancelar", "não quero", "desistir"].includes(texto.toLowerCase()) || intencao === 'cancelar') {
    await message.reply(formatarMensagemBonita(
      'Atendimento Cancelado',
      `Pedido cancelado. Se quiser recomeçar, só avisar!`
    ));
    resetarCliente(clienteId, true);
    return;
  }

  if (intencao === 'outro') {
    await message.reply(formatarMensagemBonita(
      '🤔 Não entendi',
      `Pode explicar melhor? Estou aqui para te ajudar com impressão, xerox, foto 3x4, pagamento, agendamento e tudo que precisar!`
    ));
    status.ultimoEvento = Date.now();
    return;
  }

  status.ultimoEvento = Date.now();
});

// Inicializa o client
client.initialize();
