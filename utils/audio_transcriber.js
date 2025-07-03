const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function transcribeAudio(buffer, filename = "audio.mp3") {
    try {
        const response = await openai.audio.transcriptions.create({
            file: {
                value: buffer,
                options: { filename: filename, contentType: "audio/mpeg" }
            },
            model: "whisper-1",
            response_format: "text",
            language: "pt"
        });
        // Se vier vazio ou erro, log para debug
        if (!response || typeof response !== "string" || response.trim().length < 2) {
            console.log("OpenAI transcrição retornou vazio ou erro:", response);
            return null;
        }
        return response.trim();
    } catch (err) {
        // Mostra o erro real retornado
        console.error("Erro OpenAI ao transcrever áudio:", err?.message || err);
        return null;
    }
}

module.exports = transcribeAudio;
