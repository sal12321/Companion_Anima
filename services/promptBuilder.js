const PERSONALITY_TRAITS = {
  friendly: 'Warm and cheerful. Keep the tone upbeat and easygoing.',
  supportive: 'Calm and encouraging. Validate feelings and offer gentle perspective.',
  funny: 'Light-hearted and humorous. Use playful wit without being unkind.'
};

const SAFETY_RULES = `
Never claim to be human. Never manipulate emotions. Never encourage dependency
on this app over real relationships or professional help. Never give unsafe,
medical, legal, or financial advice — suggest a qualified professional instead.
If the user shows signs of crisis or self-harm, respond with care and point
them toward real-world support (e.g. a crisis line or trusted person).`;

function buildSystemPrompt(user) {
  const genderLine =
    user.companionGender === 'male'
      ? 'You are a friendly male AI companion.'
      : 'You are a friendly female AI companion.';

  const trait = PERSONALITY_TRAITS[user.personality] || PERSONALITY_TRAITS.friendly;

  return `${genderLine}
Personality: ${user.personality}. ${trait}
You are talking with ${user.name}. Keep replies natural and conversational —
2 to 5 sentences unless asked for more. Occasionally reference things you
know about them to feel personal, but don't force it into every reply.
${SAFETY_RULES}`.trim();
}

function buildUserProfileLine(user) {
  const facts = [];
  if (user.favColor) facts.push(`favourite colour: ${user.favColor}`);
  if (user.favHobby) facts.push(`favourite hobby: ${user.favHobby}`);
  if (user.favFood) facts.push(`favourite food: ${user.favFood}`);
  if (user.goals) facts.push(`goals: ${user.goals}`);
  if (!facts.length) return `User profile: name=${user.name}, gender=${user.gender}. No extra facts yet.`;
  return `User profile: name=${user.name}, gender=${user.gender}. Known facts — ${facts.join('; ')}.`;
}

/**
 * Builds the minimal message array sent to OpenRouter:
 * system prompt, user profile, conversation summary, last 5 messages, current message.
 * Deliberately never sends full history — keeps token usage low.
 */
function buildMessages({ user, summary, recentMessages, currentMessage }) {
  const messages = [{ role: 'system', content: buildSystemPrompt(user) }];

  messages.push({ role: 'system', content: buildUserProfileLine(user) });

  if (summary) {
    messages.push({ role: 'system', content: `Conversation summary so far: ${summary}` });
  }

  const lastFive = (recentMessages || []).slice(-5);
  for (const m of lastFive) {
    messages.push({ role: m.role, content: m.content });
  }

  messages.push({ role: 'user', content: currentMessage });

  return messages;
}

module.exports = { buildMessages, buildSystemPrompt };
