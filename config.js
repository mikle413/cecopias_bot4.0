// config.js
require('dotenv').config();
const path = require('path');

module.exports = {
    // Caminho para o arquivo de sessão do WhatsApp (login)
    SESSION_FILE: process.env.SESSION_FILE 
        ? path.resolve(process.env.SESSION_FILE) 
        : path.resolve(__dirname, 'session.json'),

    // Caminho para o arquivo onde ficam as despesas/receitas
    DATA_FILE: process.env.DATA_FILE 
        ? path.resolve(process.env.DATA_FILE) 
        : path.resolve(__dirname, 'data.json'),

    // Porta de um servidor local (se for rodar interface web futuramente)
    PORT: process.env.PORT || 3000,

    // Diretório para salvar arquivos exportados (CSV/PDF)
    EXPORT_DIR: process.env.EXPORT_DIR 
        ? path.resolve(process.env.EXPORT_DIR) 
        : path.resolve(__dirname),

    // Outras configs que queira adicionar no futuro
    // Exemplo: chave de API para OCR, etc.
};
