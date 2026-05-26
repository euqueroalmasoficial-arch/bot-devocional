const twilio = require('twilio');
const Anthropic = require('@anthropic-ai/sdk');
const cron = require('node-cron');
const { contatos } = require('./contatos');

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function gerarDevocional() {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long', day: '2-digit',
    month: 'long', year: 'numeric'
  });
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: `Você é o sistema "Eu quero Almas".
Gere uma mensagem devocional curta para WhatsApp.
Data atual: ${hoje}.
Use emojis e negrito (*texto*) do WhatsApp.
Máximo 500 caracteres. Seja direto e impactante.
Inclua um versículo bíblico e uma reflexão curta.`,
    messages: [{ role: 'user', content: 'Gere o devocional de hoje.' }]
  });
  return msg.content[0].text;
}

async function enviarParaTodos() {
  console.log('Gerando devocional...');
  let texto;
  try {
    texto = await Promise.race([
      gerarDevocional(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 60s')), 60000))
    ]);
  } catch (e) {
    console.error('Erro ao gerar devocional:', e.message);
    return;
  }
  console.log('Texto gerado! Enviando para', contatos.length, 'contatos...');
  for (const numero of contatos) {
    try {
      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${numero}`,
        body: texto
      });
      console.log('Enviado:', numero);
    } catch (e) {
      console.error('Erro em', numero, e.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('Concluído!');
}

// Teste às 17h50 — depois mude para '0 6 * * *'
cron.schedule('45 22 * * *', enviarParaTodos, {
  timezone: 'America/Sao_Paulo'
});

console.log('Bot ativo — aguardando 22h45 de Brasília...');
