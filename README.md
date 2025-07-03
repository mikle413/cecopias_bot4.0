# 🤖 Ce Cópias Bot WhatsApp

Assistente inteligente de atendimento para loja de impressão via WhatsApp.  
Automatize orçamentos, pagamentos, recebimento de arquivos, dúvidas, confirmação e agendamento, com integração OpenAI e Mercado Pago!

---

## 🚀 **Funcionalidades Principais**

- **Saudação única personalizada:**  
  Dá boas-vindas só uma vez por sessão, já divulga o endereço, horário e Instagram da loja.
- **Orçamento automático:**  
  Detecta e responde pedidos de impressão, xerox, foto 3x4, etc., já mostrando o valor.
- **Detecção inteligente de intenção:**  
  Usa IA (OpenAI GPT-4o) para entender o que o cliente quer em qualquer contexto.
- **Recebimento de arquivos com espera:**  
  Se receber arquivos e o cliente sumir, envia aviso simpático antes de cancelar.
- **Atendimento presencial reconhecido:**  
  Não incomoda o cliente se perceber que está sendo atendido na loja.
- **Controle de sessão e histórico:**  
  Entende e reage conforme todo o histórico da conversa (não fica burro!).
- **Timer especial para arquivos presenciais:**  
  Se o cliente enviar vários arquivos presencialmente e não responder, avisa e encerra após 5 min.
- **Agendamento e confirmação de pedido:**  
  Permite o cliente agendar retirada, paga online ou presencial, e só executa após confirmação.
- **Geração dinâmica de link Mercado Pago:**  
  Link confiável, direto e amigável para pagamento online, sem burocracia.
- **Pagamentos via PIX:**  
  Chave já enviada na resposta, fácil para copiar e pagar.
- **Respostas bonitas, organizadas e amigáveis:**  
  Sempre com emojis, espaçamento, textos claros e link do Instagram clicável.

---

## ⚙️ **Como Usar**

### 1. Instale as dependências:
```bash
npm install
2. Crie o arquivo .env na raiz do projeto:
env
Copiar
Editar
OPENAI_API_KEY=sk-xxxxxxx
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxx
3. Rode o bot:
bash
Copiar
Editar
npm start
Ou

bash
Copiar
Editar
node index.js
4. Escaneie o QR code que aparece no terminal com seu WhatsApp.
🧪 Exemplos de Uso
Saudação:
Envie: oi
O bot responde com mensagem de boas-vindas, endereço, horário e link do Instagram.

Pedido de impressão:
Envie: Quero imprimir 10 páginas coloridas
O bot entende, responde o orçamento e pergunta se deseja fechar o pedido.

Arquivo sem texto (primeiro contato):
Envie um PDF ou JPG
O bot responde que recebeu o arquivo e aguarda instruções.

Vários arquivos presenciais sem resposta:
Envie 2 ou mais arquivos (PDF, foto) sem mensagem.
Se não responder em 5 minutos, recebe mensagem simpática avisando sobre cancelamento e opção de agendar/pagar para garantir.

Agendar/confirmar pedido:
Envie: quero agendar para amanhã
Bot orienta sobre pagamento antecipado para garantir a entrega.

Dúvida:
Envie: Vocês fazem plastificação?
Bot responde incentivando dúvidas e se coloca à disposição.

Cancelar:
Envie: cancelar
Bot encerra atendimento, explica e se coloca disponível para recomeçar.

🏆 Diferenciais
🎯 Detecção de intenção por IA: O bot realmente entende a conversa, não responde de forma "burra".

🕒 Timers inteligentes: Não deixa o cliente "no limbo", mas também não enche o saco.

😃 Texto sempre amigável: Nada de respostas frias ou robóticas.

💳 Pagamentos fáceis: PIX e Mercado Pago, tudo explicado e seguro.

📍 Propaganda integrada: Ajuda a aumentar o engajamento e trazer novos clientes.

📝 Personalização
Troque os dados da loja no bloco DADOS_LOJA do index.js (nome, horário, endereço, PIX, Instagram).

Personalize textos, emojis e mensagens para o perfil do seu público.

💡 Sugestões de Melhoria
Integrar com sistemas de fila/ordem de serviço.

Relatórios automáticos de vendas e atendimentos.

Dashboard para acompanhamento de pedidos em tempo real.

Feito com ❤️ para automação da Ce Cópias.
Se gostou, indica pra um amigo!