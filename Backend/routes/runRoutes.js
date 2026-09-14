const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const runController = require('../controllers/runController');

router.post('/', auth, runController.runCode);

module.exports = router;
