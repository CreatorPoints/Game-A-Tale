const { App } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

const knowledgePath = path.join(__dirname, 'knowledge.txt');
let knowledgeBase = '';
if (fs.existsSync(knowledgePath)) {
  knowledgeBase = fs.readFileSync(knowledgePath, 'utf8');
}

async function askAI(userPrompt) {
  const response = await fetch(`${process.env.AI_BASE_URL || 'https://ai.hackclub.com/proxy/v1'}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'google/gemini-2.5-flash',
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content: `You are Village Storyteller (@storytale), the AI assistant for Game A Tale (An Official Hack Club YSWS). Keep replies punchy, humorous, and strictly 1 to 3 sentences max—never write walls of text. STRICT ANTI-HALLUCINATION RULE: You only know what is written in the knowledge base below. Never invent, speculate, or assume any deadlines, prizes, payouts, eligibility, or rules. If any detail is missing, unconfirmed, or not in the knowledge base, explicitly say you do not know or it has not been officially decided yet, and tell them to ping @CreatorPoints. Follow the knowledge base strictly:\n\n${knowledgeBase}`
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`AI request error ${response.status}: ${errorDetails}`);
  }

  const result = await response.json();
  return result?.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
}

app.event('app_mention', async ({ event, say }) => {
  try {
    const cleanedText = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    if (!cleanedText) {
      await say({
        text: 'Hey! How can I help you?',
        thread_ts: event.thread_ts || event.ts
      });
      return;
    }
    const reply = await askAI(cleanedText);
    await say({
      text: reply,
      thread_ts: event.thread_ts || event.ts
    });
  } catch (error) {
    console.error('Error handling app_mention:', error);
    await say({
      text: 'Sorry, I encountered an issue processing your request.',
      thread_ts: event.thread_ts || event.ts
    });
  }
});

app.message(async ({ message, say }) => {
  if (message.subtype || message.bot_id) {
    return;
  }
  if (message.channel_type !== 'im') {
    return;
  }
  try {
    const cleanedText = message.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    if (!cleanedText) {
      return;
    }
    const reply = await askAI(cleanedText);
    await say({
      text: reply,
      thread_ts: message.thread_ts
    });
  } catch (error) {
    console.error('Error handling message:', error);
    await say({
      text: 'Sorry, I encountered an issue processing your request.',
      thread_ts: message.thread_ts
    });
  }
});

(async () => {
  await app.start();
  console.log('Game A Tale Slack bot is running in Socket Mode.');
})();
