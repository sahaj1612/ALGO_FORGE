/**
 * Queue and Resource Limit Protection Middleware
 * Prevents queue starvation, monopolization, and resource exhaustion attacks.
 */

const Submission = require('../models/Submission');
const judgeQueue = require('../queues/judgeQueue');

const MAX_CONCURRENT_PER_USER = Number(process.env.MAX_CONCURRENT_SUBMISSIONS_PER_USER) || 3;
const MAX_GLOBAL_QUEUE_DEPTH = Number(process.env.MAX_GLOBAL_QUEUE_DEPTH) || 500;
const MAX_QUEUE_WAIT_AGE_SEC = Number(process.env.MAX_QUEUE_WAIT_AGE_SEC) || 30;
const MAX_CODE_BYTES = 65536; // 64 KB

const runQueue = require('../queues/runQueue');

/**
 * Limit concurrent active submissions per user and apply adaptive queue backpressure
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

    // 3. Adaptive Backpressure: Queue backlog depth and oldest-job age check
    try {
      if (judgeQueue && typeof judgeQueue.getWaitingCount === 'function') {
        const waitingCount = await judgeQueue.getWaitingCount();
        if (waitingCount >= MAX_GLOBAL_QUEUE_DEPTH) {
          res.setHeader('Retry-After', '10');
          return res.status(503).json({
            error: {
              code: 'QUEUE_SATURATED',
              message: 'The judge queue is currently at capacity. Controlled backpressure is active; please retry shortly.'
            },
            requestId: req.id
          });
        }

        // Check oldest job wait age
        const waitingJobs = await judgeQueue.getJobs(['waiting'], 0, 1);
        if (waitingJobs && waitingJobs.length > 0 && waitingJobs[0]?.timestamp) {
          const waitAgeSec = Math.round((Date.now() - waitingJobs[0].timestamp) / 1000);
          if (waitAgeSec >= MAX_QUEUE_WAIT_AGE_SEC) {
            res.setHeader('Retry-After', '15');
            return res.status(503).json({
              error: {
                code: 'QUEUE_LATENCY_ELEVATED',
                message: `Queue wait time is currently elevated (${waitAgeSec}s). Please wait for capacity to recover.`
              },
              requestId: req.id
            });
          }
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

/**
 * Adaptive backpressure protection for interactive code runs
 */
async function enforceRunLimits(req, res, next) {
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
    if (runQueue && typeof runQueue.getWaitingCount === 'function') {
      const waitingCount = await runQueue.getWaitingCount();
      if (waitingCount >= MAX_GLOBAL_QUEUE_DEPTH) {
        res.setHeader('Retry-After', '5');
        return res.status(503).json({
          error: {
            code: 'RUN_CAPACITY_EXHAUSTED',
            message: 'Interactive runner pool is currently at maximum capacity. Please retry in a few moments.'
          },
          requestId: req.id
        });
      }
    }
  } catch {}

  next();
}

module.exports = {
  enforceUserSubmissionLimits,
  enforceRunLimits,
  MAX_CONCURRENT_PER_USER,
  MAX_GLOBAL_QUEUE_DEPTH,
  MAX_QUEUE_WAIT_AGE_SEC,
  MAX_CODE_BYTES
};
