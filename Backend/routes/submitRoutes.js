const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const submissionController = require('../controllers/submissionController');

router.post('/', auth, submissionController.createSubmission);

module.exports = router;
