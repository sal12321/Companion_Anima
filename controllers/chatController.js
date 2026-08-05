const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { getOrCreateConversation, appendExchange } = require('../services/memoryService');
const { buildMessages } = require('../services/promptBuilder');
const { streamComplete } = require('../services/openrouterService');
const logger = require('../utils/logger');

/**
 * Streams the AI reply back as plain chunked text. Client reads it with a
 * ReadableStream reader. Keeps things simple — no SSE parsing needed.
 */
async function sendMessage(req, res) {
  try {
    const { userId, message } = req.body;
    if (!userId || !message || !message.trim()) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const convo = await getOrCreateConversation(userId);

    const messages = buildMessages({
      user,
      summary: convo.summary,
      recentMessages: convo.messages,
      currentMessage: message
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

    let full = '';
    await streamComplete(
      messages,
      (token) => {
        full += token;
        res.write(token);
      },
      { temperature: 0.7, max_tokens: 300 }
    );

    res.end();

    await appendExchange(convo, message, full || '...');
  } catch (err) {
    logger.error(`sendMessage failed: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chat request failed' });
    } else {
      res.end();
    }
  }
}

async function getHistory(req, res) {
  try {
    const convo = await Conversation.findOne({ userId: req.params.userId });
    res.json({ messages: convo ? convo.messages : [] });
  } catch (err) {
    logger.error(`getHistory failed: ${err.message}`);
    res.status(500).json({ error: 'Could not load history' });
  }
}

// "New chat" clears the visible message log but keeps the long-term summary,
// so the companion still remembers who you are.
async function newChat(req, res) {
  try {
    const convo = await Conversation.findOne({ userId: req.params.userId });
    if (convo) {
      convo.messages = [];
      convo.messageCountSinceSummary = 0;
      await convo.save();
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error(`newChat failed: ${err.message}`);
    res.status(500).json({ error: 'Could not start new chat' });
  }
}

// Full wipe — messages AND summary.
async function deleteConversation(req, res) {
  try {
    await Conversation.deleteOne({ userId: req.params.userId });
    res.json({ ok: true });
  } catch (err) {
    logger.error(`deleteConversation failed: ${err.message}`);
    res.status(500).json({ error: 'Could not delete conversation' });
  }
}

module.exports = { sendMessage, getHistory, newChat, deleteConversation };
