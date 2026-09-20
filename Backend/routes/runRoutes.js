const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const runController = require('../controllers/runController');
const { runLimiter } = require('../middleware/rateLimiter');
const { validateRun } = require('../middleware/validator');

router.post('/', auth, runLimiter, validateRun, runController.runCode);

module.exports = router;
