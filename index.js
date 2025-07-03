const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const JsonFileAdapter = require('@bot-whatsapp/database/json');
const { perguntarAoChatGPT } = require('./utils/openai');
const { handleServicesFlow, getAllServices } = require('./services');
const fs = require('fs');

const historicoMensagens = new Map();

// Evita flood de mensagens repetidas para o mesmo número
const evitarFlood = (numero, mensagem) => {
    const ultima = historicoMensagens.get(numero);
    if (ultima === mensagem) return true;
    historicoMensagens.set(numero, mensagem);
    return false;
};

// Saudação simples (sem endereço nem horário)
const fluxoPrincipal = addKeyword(['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite'])
    .addAnswer('👋 Oi! Tudo bem? Me diga o que deseja e já te ajudo 🙂');

// Despedida com endereço e horário
const fluxoDespedida = addKeyword(['obrigado', 'valeu', 'até mais'])
    .addAnswer('😊 Obrigado por usar a CeCópias!\n\n📍 Endereço: Av. Exemplo, 123 - Centro\n🕒 Atendimento: Seg a Sex, das 08h às 18h.\n\nQuando quiser, é só chamar!');

// Resposta padrão para comandos diretos reconhecidos
const fluxoComandosDiretos = addKeyword(['serviço', 'preço', 'pdf', 'xerox', 'imprimir', 'digitalizar', 'enviar arquivo'])
    .addAnswer('📌 Me diga qual serviço você precisa e, se possível, já envie o arquivo.');

// Fluxo inteligente com GPT-4 (fallback quando não entende)
const fluxoInteligente = addKeyword(/.*/).addAction(async (ctx, { flowDynamic }) => {
    const msg = ctx.body?.trim();
    const numero = ctx.from;

    if (!msg) return;

    // Prevenção de flood
    if (evitarFlood(numero, msg)) return;

    // Ignora se for saudação ou despedida
    const mensagensIgnoradas = [
        'oi', 'olá', 'bom dia', 'boa tarde', 'boa noite',
        'obrigado', 'valeu', 'até mais'
    ];
    if (mensagensIgnoradas.includes(msg.toLowerCase())) return;

    // Já tratadas por comandos diretos
    const palavrasChave = ['copiar', 'imprimir', 'arquivo', 'xerox', 'preto', 'colorido', 'digitalizar', 'preço', 'pdf'];
    if (palavrasChave.some(p => msg.toLowerCase().includes(p))) return;

    // Chamar o GPT-4 como fallback
    const respostaGPT = await perguntarAoChatGPT(msg);
    if (respostaGPT) {
        await flowDynamic(respostaGPT);
    }
});

// Fluxo principal do bot
const main = async () => {
    const adapterDB = new JsonFileAdapter();
    const adapterFlow = createFlow([
        fluxoPrincipal,
        fluxoDespedida,
        fluxoComandosDiretos,
        handleServicesFlow(),
        fluxoInteligente
    ]);

    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });
};

main();
