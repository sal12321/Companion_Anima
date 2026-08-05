const User = require('../models/User');
const logger = require('../utils/logger');

async function createUser(req, res) {
  try {
    const { name, gender, companionGender, personality } = req.body;

    if (!name || !gender || !companionGender || !personality) {
      return res.status(400).json({ error: 'name, gender, companionGender and personality are required' });
    }

    const user = await User.create({
      name: name.trim(),
      gender,
      companionGender,
      personality
    });

    res.status(201).json({ user });
  } catch (err) {
    logger.error(`createUser failed: ${err.message}`);
    res.status(500).json({ error: 'Could not create user profile' });
  }
}

async function getUser(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    logger.error(`getUser failed: ${err.message}`);
    res.status(500).json({ error: 'Could not fetch user' });
  }
}

async function updateUserFacts(req, res) {
  try {
    const { favColor, favHobby, favFood, goals } = req.body;
    const update = {};
    if (favColor !== undefined) update.favColor = favColor;
    if (favHobby !== undefined) update.favHobby = favHobby;
    if (favFood !== undefined) update.favFood = favFood;
    if (goals !== undefined) update.goals = goals;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    logger.error(`updateUserFacts failed: ${err.message}`);
    res.status(500).json({ error: 'Could not update user' });
  }
}

module.exports = { createUser, getUser, updateUserFacts };
