const express = require('express');
const router = express.Router();
const { execute } = require('../controllers/executeController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/execute', authMiddleware, execute);

module.exports = router;
