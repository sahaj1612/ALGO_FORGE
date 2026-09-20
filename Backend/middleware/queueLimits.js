/**
 * Queue and Resource Limit Protection Middleware
 * Prevents queue starvation, monopolization, and resource exhaustion attacks.
 */

const Submission = require('../models/Submission');
const judgeQueue = require('../queues/judgeQueue');

const MAX_CONCURRENT_PER_USER = Number(process.env.MAX_CONCURRENT_SUBMISSIONS_PER_USER) || 3;
const MAX_GLOBAL_QUEUE_DEPTH = Number(process.env.MAX_GLOBAL_QUEUE_DEPTH) || 500;
const MAX_CODE_BYTES = 65536; // 64 KB

/**
 * Limit concurrent active submissions per user to prevent queue flooding
 */
async function enforceUserSubmissionLimits(req, res, next) {
  if (!req.user || !req.user.id) {
    return next();
  }

  // 1. Verify code payload size
  if (req.body && typeof req.body.code === 'string' && Buffer.byteLength(req.body.code, 'utf8') > MAX_CODE_BYTES) {
    return res.status(400).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: `Solution code exceeds the maximum permitted size of ${MAX_CODE_BYTES / 1024} KB.`
      },
      requestId: req.id
    });
  }

  try {
    // 2. Check active (pending or running) submissions for this user
    const activeCount = await Submission.countDocuments({
      userId: req.user.id,
      status: { $in: ['pending', 'running'] }
    });

    if (activeCount >= MAX_CONCURRENT_PER_USER) {
      res.setHeader('Retry-After', '5');
      return res.status(429).json({
        error: {
          code: 'CONCURRENCY_LIMIT_EXCEEDED',
          message: `Too many submissions in flight. You have ${activeCount} active jobs. Max allowed is ${MAX_CONCURRENT_PER_USER}.`
        },
        requestId: req.id
      });
    }

    // 3. Check global queue backlog (failsafe against DDoS queue flood)
    try {
      if (judgeQueue && typeof judgeQueue.getWaitingCount === 'function') {
        const waitingCount = await judgeQueue.getWaitingCount();
        if (waitingCount >= MAX_GLOBAL_QUEUE_DEPTH) {
          res.setHeader('Retry-After', '10');
          return res.status(503).json({
            error: {
              code: 'QUEUE_SATURATED',
              message: 'The judge queue is currently at capacity. Please retry shortly.'
            },
            requestId: req.id
          });
        }
      }
    } catch {
      // If queue metrics are temporarily unavailable in test mode, do not block
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  enforceUserSubmissionLimits,
  MAX_CONCURRENT_PER_USER,
  MAX_GLOBAL_QUEUE_DEPTH,
  MAX_CODE_BYTES
};
