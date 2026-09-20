const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const submissionController = require('../controllers/submissionController');
const { submitLimiter } = require('../middleware/rateLimiter');
const { validateSubmission } = require('../middleware/validator');
const idempotencyMiddleware = require('../middleware/idempotency');
const { enforceUserSubmissionLimits } = require('../middleware/queueLimits');

router.post(
  '/',
  auth,
  submitLimiter,
  idempotencyMiddleware,
  validateSubmission,
  enforceUserSubmissionLimits,
  submissionController.createSubmission
);

module.exports = router;
