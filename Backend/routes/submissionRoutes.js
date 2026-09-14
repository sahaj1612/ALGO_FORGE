const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const submissionController = require('../controllers/submissionController');

// 1. GET SUBMISSIONS HISTORY (Cursor-based pagination with filters)
router.get('/', auth, submissionController.listSubmissions);

// 2. GET SINGLE SUBMISSION (Enforces ownership & returns documented terminal status)
router.get('/:id', auth, submissionController.getSubmission);

module.exports = router;
