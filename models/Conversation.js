const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messages: { type: [MessageSchema], default: [] },
    summary: { type: String, default: '' },
    messageCountSinceSummary: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', ConversationSchema);
