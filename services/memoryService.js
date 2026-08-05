const Conversation = require('../models/Conversation');
const { complete } = require('./openrouterService');
const logger = require('../utils/logger');

const SUMMARY_TRIGGER = 20; // messages (user+assistant combined)
const KEEP_RAW_MESSAGES = 30; // cap stored raw messages so the doc doesn't grow unbounded

async function getOrCreateConversation(userId) {
  let convo = await Conversation.findOne({ userId });
  if (!convo) {
    convo = await Conversation.create({ userId, messages: [], summary: '' });
  }
  return convo;
}

async function appendExchange(convo, userMessage, assistantMessage) {
  convo.messages.push({ role: 'user', content: userMessage });
  convo.messages.push({ role: 'assistant', content: assistantMessage });
  convo.messageCountSinceSummary += 2;

  // Trim stored raw messages to keep the document small.
  if (convo.messages.length > KEEP_RAW_MESSAGES) {
    convo.messages = convo.messages.slice(-KEEP_RAW_MESSAGES);
  }

  await maybeSummarize(convo);
  await convo.save();
  return convo;
}

async function maybeSummarize(convo) {
  if (convo.messageCountSinceSummary < SUMMARY_TRIGGER) return;

  try {
    const transcript = convo.messages
      .slice(-SUMMARY_TRIGGER)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const summaryPrompt = [
      {
        role: 'system',
        content:
          'Condense the following chat transcript into a short factual summary (max 4 sentences) ' +
          'capturing key facts, preferences, and emotional context worth remembering long-term. ' +
          'No commentary, just the summary.'
      },
      { role: 'user', content: transcript }
    ];

    const newSummary = await complete(summaryPrompt, { temperature: 0.3, max_tokens: 150 });

    convo.summary = convo.summary
      ? `${convo.summary} ${newSummary}`.slice(-1200) // bound summary growth
      : newSummary;

    convo.messageCountSinceSummary = 0;
  } catch (err) {
    logger.error(`Summary generation failed: ${err.message}`);
    // Non-fatal — chat continues without a fresh summary this round.
  }
}

module.exports = { getOrCreateConversation, appendExchange };
