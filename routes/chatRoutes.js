const express = require('express');
const router = express.Router();
const { sendMessage, getHistory, newChat, deleteConversation } = require('../controllers/chatController');

router.post('/message', sendMessage);
router.get('/history/:userId', getHistory);
router.post('/new/:userId', newChat);
router.delete('/:userId', deleteConversation);

module.exports = router;
