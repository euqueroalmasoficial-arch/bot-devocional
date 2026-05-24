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
    max_tokens: 1500,
    system: `Você é o sistema "Eu quero Almas".
Gere APENAS o FORMATO 2 (WhatsApp) do devocional diário.
Data atual: ${hoje} (fuso America/Sao_Paulo).
Siga o plano de leitura em 1 ano da Universal.org.
Dia 1 = Gênesis 1 + Mateus 1 + Esdras 1.
Use emojis, negrito (*texto*) e itálico (_texto_) do WhatsApp.
Máximo 1500 caracteres. Seja direto e impactante.`,
    messages: [{ role: 'user', content: 'Gere o devocional de hoje.' }]
  });

  return msg.content[0].text;
}

async function enviarParaTodos() {
  console.log('Gerando devocional...');
  const texto = await gerarDevocional();
  console.log('Enviando para', contatos.length, 'contatos...');

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

// Roda todo dia às 6h (horário de Brasília)
cron.schedule('17 20 * * *', enviarParaTodos, {
  timezone: 'America/Sao_Paulo'
});

console.log('Bot ativo — aguardando 6h de Brasília...');

