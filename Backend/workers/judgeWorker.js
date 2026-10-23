const config = require('../config/env');
const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const { execute, matches } = require('../services/judge');
const logger = require('../utils/logger');

// Connect to MongoDB if not already connected
if (mongoose.connection.readyState === 0) {
  mongoose.connect(config.mongodbUri)
    .then(() => logger.info('Judge worker connected to MongoDB'))
    .catch(err => logger.error(`Judge worker MongoDB connection error: ${err.message}`));
}

/**
 * Core submission processor function
 * Exposed for direct unit/worker test invocation as well as BullMQ processing.
 */
async function processSubmissionJob({ submissionId, jobId, correlationId }) {
  const subId = String(submissionId);
  logger.info('Processing submission job', { submissionId: subId, jobId, correlationId });

  // The private snapshot is deliberately selected here and nowhere in a
  // user-facing read path.
  const sub = await Submission.findById(subId).select('+problemSnapshot');
  if (!sub) {
    logger.warn('Submission not found in database', { submissionId: subId });
    return null;
  }

  await Submission.findByIdAndUpdate(subId, {
    status: 'running',
    heartbeatAt: new Date(),
    ...(correlationId ? { correlationId } : {})
  });

  try {
    const problem = await Problem.findById(sub.problemId).select('version signature adapter hiddenTestcases timeLimit memoryLimit');
    if (!problem && !sub.problemSnapshot) {
      logger.warn('Problem no longer exists for submission', { submissionId: subId, problemId: sub.problemId });
      return Submission.findByIdAndUpdate(
        subId,
        { status: 'server_error', error: 'Problem no longer exists.' },
        { returnDocument: 'after' }
      );
    }

    // Existing submissions created before snapshots are supported once, but
    // all newly-created submissions execute from their immutable snapshot.
    const snapshot = sub.problemSnapshot || {
      version: problem.version || 1,
      signature: problem.signature,
      adapter: problem.adapter,
      hiddenTestcases: problem.hiddenTestcases || [],
      timeLimit: problem.timeLimit || 4000,
      memoryLimit: problem.memoryLimit || 256
    };
    const problemVersion = snapshot.version;
    const casesToRun = snapshot.hiddenTestcases;

    const results = [];
    let maxTime = 0;
    let maxMemory = 0;
    let verdict = 'accepted';
    let ordinal = 1;

    for (const test of casesToRun) {
      const result = await execute({
        code: sub.code,
        input: test.input,
        language: sub.language,
        signature: snapshot.signature,
        adapter: snapshot.adapter,
        timeLimit: snapshot.timeLimit,
        memoryLimit: snapshot.memoryLimit
      });

      maxTime = Math.max(maxTime, result.time || 0);
      maxMemory = Math.max(maxMemory, result.memory || 0);

      let status;
      if (result.verdict !== 'accepted') {
        status = result.verdict;
      } else if (!matches(result.output, test.output)) {
        status = 'wrong_answer';
      } else {
        status = 'passed';
      }

      // Hidden testcases must NEVER reveal raw input or expected output
      results.push({
        ordinal,
        status,
        time: result.time || 0,
        memory: result.memory || null,
        error: result.error || null
      });

      if (status !== 'passed') {
        verdict = status;
        break;
      }
      ordinal++;
    }

    const updated = await Submission.findByIdAndUpdate(
      subId,
      {
        status: verdict,
        results,
        time: maxTime,
        memory: maxMemory || null,
        error: results.find(r => r.error)?.error || null,
        problemVersion,
        heartbeatAt: new Date()
      },
      { returnDocument: 'after' }
    );

    logger.info('Submission judged successfully', {
      submissionId: subId,
      verdict,
      casesRun: results.length,
      time: maxTime,
      correlationId
    });

    return updated;
  } catch (err) {
    logger.error(`Judge worker error: ${err.message}`, {
      submissionId: subId,
      error: err.message,
      correlationId
    });
    return Submission.findByIdAndUpdate(
      subId,
      {
        status: 'server_error',
        error: err.message || 'Worker encountered an internal error.',
        heartbeatAt: new Date()
      },
      { returnDocument: 'after' }
    );
  }
}

let worker = null;
if (process.env.NODE_ENV !== 'test') {
  try {
    worker = new Worker('judge-queue', async (job) => {
      return processSubmissionJob({
        submissionId: job.data.submissionId,
        jobId: job.id,
        correlationId: job.data.correlationId
      });
    }, {
      connection: {
        host: config.redisHost,
        port: config.redisPort
      },
      concurrency: 2
    });

    worker.on('ready', () => logger.info('Judge worker started and listening on judge-queue'));
    worker.on('error', err => logger.error(`Judge worker BullMQ error: ${err.message}`));
  } catch (initErr) {
    logger.error(`Judge worker failed to initialize: ${initErr.message}`);
  }
}

module.exports = {
  processSubmissionJob,
  worker
};
