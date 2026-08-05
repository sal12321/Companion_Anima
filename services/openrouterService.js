const fetch = require('node-fetch');
const logger = require('../utils/logger');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Non-streaming completion. Used for short internal tasks like
 * generating a conversation summary (keeps token usage low & simple).
 */
async function complete(messages, { temperature = 0.7, max_tokens = 300 } = {}) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Companion Research Demo'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3',
      messages,
      temperature,
      max_tokens,
      stream: false
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error(`OpenRouter error (${res.status}): ${errText}`);
    throw new Error('OpenRouter request failed');
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Streaming completion. Calls onToken(chunkText) as tokens arrive.
 * Returns the full accumulated text at the end.
 */
async function streamComplete(messages, onToken, { temperature = 0.7, max_tokens = 300 } = {}) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Companion Research Demo'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3',
      messages,
      temperature,
      max_tokens,
      stream: true
    })
  });

  if (!res.ok || !res.body) {
    const errText = res.body ? await res.text() : 'no response body';
    logger.error(`OpenRouter stream error (${res.status}): ${errText}`);
    throw new Error('OpenRouter stream request failed');
  }

  let full = '';
  let buffer = '';

  for await (const chunk of res.body) {
    buffer += chunk.toString('utf8');
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line for next round

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.replace(/^data:\s*/, '');
      if (payload === '[DONE]') continue;

      try {
        const json = JSON.parse(payload);
        const token = json.choices?.[0]?.delta?.content;
        if (token) {
          full += token;
          onToken(token);
        }
      } catch (e) {
        // Ignore malformed/partial JSON chunks
      }
    }
  }

  return full;
}

module.exports = { complete, streamComplete };
