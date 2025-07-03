const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { getAllServices } = require('../services');

function gerarContextoDeServicos() {
    const lista = getAllServices()
    let contexto = 'Lista de serviços disponíveis com preços:\n'
    for (const serv of lista) {
        contexto += `- ${serv.nome}: R$ ${serv.preco.toFixed(2)}\n`
    }
    return contexto
}

async function perguntarAoChatGPT(texto) {
    try {
        const contextoServicos = gerarContextoDeServicos()
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `Você é um atendente virtual da CeCópias. Responda sempre com base nesta lista de serviços e preços:\n\n${contextoServicos}\n\nSeja direto, objetivo e educado. Nunca invente preços.`
                },
                { role: 'user', content: texto }
            ],
            temperature: 0.5,
        });
        return response.choices[0].message.content.trim();
    } catch (err) {
        console.error('[GPT-4 ERROR]', err.message);
        return null;
    }
}

module.exports = { perguntarAoChatGPT };
