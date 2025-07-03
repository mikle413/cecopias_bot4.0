const express = require('express');
const mercadopago = require('mercadopago');
const { Client, LocalAuth } = require('whatsapp-web.js');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configura Mercado Pago (você pode remover se estiver usando SDK v3 e não precisar)
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// Inicializa cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.initialize();

app.post('/mp/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const payment = await mercadopago.payment.findById(data.id);
      const info = payment.body;

      if (info.status === 'approved') {
        const clienteId = info.external_reference;
        console.log(`Pagamento aprovado para ${clienteId}, valor R$ ${info.transaction_amount}`);

        await client.sendMessage(clienteId,
          `✅ Pagamento confirmado!\nValor: R$ ${info.transaction_amount.toFixed(2)}\n` +
          `Obrigado pela preferência! Seu pedido está sendo processado.`
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Erro no webhook Mercado Pago:', error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Webhook Mercado Pago rodando na porta ${PORT}`);
});
