const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    gender: { type: String, enum: ['male', 'female'], required: true },
    companionGender: { type: String, enum: ['male', 'female'], required: true },
    personality: {
      type: String,
      enum: ['friendly', 'supportive', 'funny'],
      required: true
    },
    favColor: { type: String, default: '' },
    favHobby: { type: String, default: '' },
    favFood: { type: String, default: '' },
    goals: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
