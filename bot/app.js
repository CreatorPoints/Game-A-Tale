const { App } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const HELP_CHANNEL_ID = process.env.HELP_CHANNEL_ID || 'C0C4B8ZLPAB';

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

const resolvedThreadsPath = path.join(__dirname, 'resolved_threads.json');

function loadResolvedThreads() {
  try {
    if (fs.existsSync(resolvedThreadsPath)) {
      const data = fs.readFileSync(resolvedThreadsPath, 'utf8');
      return new Set(JSON.parse(data));
    }
  } catch (error) {
    console.error('Error loading resolved threads:', error);
  }
  return new Set();
}

const resolvedThreads = loadResolvedThreads();

function markThreadResolved(threadTs) {
  resolvedThreads.add(threadTs);
  try {
    fs.writeFileSync(resolvedThreadsPath, JSON.stringify([...resolvedThreads]));
  } catch (error) {
    console.error('Error saving resolved threads:', error);
  }
}

function isThreadResolved(threadTs) {
  return resolvedThreads.has(threadTs);
}

const processedMessages = new Set();

function shouldProcess(ts) {
  if (processedMessages.has(ts)) {
    return false;
  }
  processedMessages.add(ts);
  if (processedMessages.size > 2000) {
    const [first] = processedMessages;
    processedMessages.delete(first);
  }
  return true;
}

async function addReactionSafely(client, channel, timestamp, name, fallback) {
  try {
    await client.reactions.add({ channel, timestamp, name });
  } catch (error) {
    if (fallback && error?.data?.error === 'invalid_name') {
      try {
        await client.reactions.add({ channel, timestamp, name: fallback });
      } catch (fallbackError) {
        console.error('Fallback reaction failed:', fallbackError?.data?.error || fallbackError.message);
      }
    } else if (error?.data?.error !== 'already_reacted') {
      console.error('Reaction failed:', error?.data?.error || error.message);
    }
  }
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

let botUserId = '';

app.action('resolve_thread', async ({ ack, body, client }) => {
  await ack();
  try {
    const actionData = JSON.parse(body.actions?.[0]?.value || '{}');
    const rootTs = actionData.root_ts;
    const channelId = actionData.channel || body.channel.id;

    if (rootTs) {
      markThreadResolved(rootTs);
      await addReactionSafely(client, channelId, rootTs, 'white_check_mark', 'heavy_check_mark');
    }

    if (body.message?.ts) {
      const existingBlocks = body.message.blocks || [];
      const textBlock = existingBlocks[0] || {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: body.message.text
        }
      };

      await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts,
        text: body.message.text,
        blocks: [
          textBlock,
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `_Marked as resolved by <@${body.user.id}>_ :white_check_mark:`
              }
            ]
          }
        ]
      });
    }
  } catch (error) {
    console.error('Error handling resolve_thread:', error);
  }
});

app.event('app_mention', async ({ event, client, say }) => {
  if (!shouldProcess(event.ts)) {
    return;
  }

  if (event.channel === HELP_CHANNEL_ID) {
    const rootTs = event.thread_ts || event.ts;
    await addReactionSafely(client, event.channel, event.ts, 'think', 'thinking_face');
    const cleanedText = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    try {
      const reply = await askAI(cleanedText || 'Hello');
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: rootTs,
        text: reply,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: reply
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'yep, i got it!',
                  emoji: true
                },
                style: 'primary',
                action_id: 'resolve_thread',
                value: JSON.stringify({ root_ts: rootTs, channel: event.channel })
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error('Error in help channel app_mention:', error);
    }
    return;
  }

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

app.message(async ({ message, client, say }) => {
  if (message.subtype || message.bot_id) {
    return;
  }

  if (!shouldProcess(message.ts)) {
    return;
  }

  if (message.channel_type === 'im') {
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
      console.error('Error handling IM:', error);
      await say({
        text: 'Sorry, I encountered an issue processing your request.',
        thread_ts: message.thread_ts
      });
    }
    return;
  }

  if (message.channel === HELP_CHANNEL_ID) {
    const rootTs = message.thread_ts || message.ts;
    const isThreadReply = Boolean(message.thread_ts);
    const isResolved = isThreadResolved(rootTs);
    const isMentioned = Boolean(botUserId && message.text && message.text.includes(`<@${botUserId}>`));

    if (isThreadReply && isResolved && !isMentioned) {
      return;
    }

    const cleanedText = message.text.replace(/<@[A-Z0-9]+>/g, '').trim();
    if (!cleanedText && !isMentioned) {
      return;
    }

    await addReactionSafely(client, message.channel, message.ts, 'think', 'thinking_face');

    try {
      const reply = await askAI(cleanedText || 'Hello');
      await client.chat.postMessage({
        channel: message.channel,
        thread_ts: rootTs,
        text: reply,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: reply
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'yep, i got it!',
                  emoji: true
                },
                style: 'primary',
                action_id: 'resolve_thread',
                value: JSON.stringify({ root_ts: rootTs, channel: message.channel })
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error('Error in help channel message:', error);
    }
  }
});

(async () => {
  const auth = await app.client.auth.test();
  botUserId = auth.user_id;
  await app.start();
  console.log('Game A Tale Slack bot is running in Socket Mode.');
})();
