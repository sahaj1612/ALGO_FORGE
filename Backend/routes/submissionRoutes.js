const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const submissionController = require('../controllers/submissionController');
const { submitLimiter, pollLimiter } = require('../middleware/rateLimiter');
const { validateSubmission } = require('../middleware/validator');
const idempotencyMiddleware = require('../middleware/idempotency');
const { enforceUserSubmissionLimits } = require('../middleware/queueLimits');

// 1. POST SUBMISSION (/api/v1/submissions alias)
router.post(
  '/',
  auth,
  submitLimiter,
  idempotencyMiddleware,
  validateSubmission,
  enforceUserSubmissionLimits,
  submissionController.createSubmission
);

// 2. GET SUBMISSIONS HISTORY (Cursor-based pagination with filters)
router.get('/', auth, submissionController.listSubmissions);

// 3. GET SINGLE SUBMISSION (Polling with rate limit & ownership authorization)
router.get('/:id', auth, pollLimiter, submissionController.getSubmission);

module.exports = router;
