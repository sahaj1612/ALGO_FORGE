const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const runController = require('../controllers/runController');
const { runLimiter } = require('../middleware/rateLimiter');
const { validateRun } = require('../middleware/validator');
const { enforceRunLimits } = require('../middleware/queueLimits');

router.post('/', auth, runLimiter, enforceRunLimits, validateRun, runController.runCode);

module.exports = router;
