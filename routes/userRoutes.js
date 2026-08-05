const express = require('express');
const router = express.Router();
const { createUser, getUser, updateUserFacts } = require('../controllers/userController');

router.post('/', createUser);
router.get('/:id', getUser);
router.patch('/:id', updateUserFacts);

module.exports = router;
