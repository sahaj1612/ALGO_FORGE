const config = require('../config/env');
const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const { execute, matches, LANGUAGES } = require('../services/judge');
const { sanitizeDiagnostic } = require('../utils/sanitizer');
const logger = require('../utils/logger');

// Connect to MongoDB if not connected
if (mongoose.connection.readyState === 0 && config.mongodbUri) {
  mongoose.connect(config.mongodbUri)
    .then(() => logger.info('Run worker connected to MongoDB'))
    .catch(err => logger.error(`Run worker MongoDB connection error: ${err.message}`));
}

/**
 * Core interactive run processor
 */
async function processRunJob(jobData) {
  const { code, problemId, language = 'javascript', testcases = [], correlationId } = jobData;
  const startedAt = Date.now();

  logger.info('Processing interactive run job', {
    correlationId,
    language,
    casesCount: testcases.length
  });

  const results = [];
  let maxTime = 0;
  let maxMemory = 0;
  let overallVerdict = 'accepted';

  for (const [idx, tc] of testcases.entries()) {
    const rawInput = tc.input !== undefined ? tc.input : tc;
    const expectedOutput = tc.output !== undefined ? tc.output : null;

    const execResult = await execute({
      code,
      input: rawInput,
      language,
      timeLimit: 4000,
      memoryLimit: 256
    });

    maxTime = Math.max(maxTime, execResult.time || 0);
    maxMemory = Math.max(maxMemory, execResult.memory || 0);

    let status = execResult.verdict;
    if (status === 'accepted') {
      if (expectedOutput !== null && expectedOutput !== undefined) {
        if (!matches(execResult.output, expectedOutput)) {
          status = 'wrong_answer';
        } else {
          status = 'passed';
        }
      } else {
        status = 'passed';
      }
    }

    if (status !== 'passed' && overallVerdict === 'accepted') {
      overallVerdict = status;
    }

    results.push({
      ordinal: idx + 1,
      status,
      input: typeof rawInput === 'object' ? JSON.stringify(rawInput) : String(rawInput ?? ''),
      expected: expectedOutput !== null && expectedOutput !== undefined ? String(expectedOutput) : undefined,
      got: execResult.output || '',
      error: execResult.error ? sanitizeDiagnostic(execResult.error) : undefined,
      time: execResult.time || 0,
      memory: execResult.memory || null
    });
  }

  logger.info('Interactive run completed', {
    correlationId,
    verdict: overallVerdict,
    durationMs: Date.now() - startedAt
  });

  return {
    results,
    verdict: overallVerdict,
    time: maxTime,
    memory: maxMemory || null
  };
}

let runWorker = null;

function startRunWorker() {
  if (runWorker) return runWorker;

  runWorker = new Worker('run-queue', async (job) => {
    return processRunJob(job.data);
  }, {
    connection: {
      host: config.redisHost,
      port: config.redisPort
    },
    concurrency: 4 // Interactive runs can process with higher concurrency
  });

  runWorker.on('ready', () => logger.info('Run worker started and listening on run-queue'));
  runWorker.on('error', err => logger.error(`Run worker BullMQ error: ${err.message}`));

  return runWorker;
}

if (process.env.NODE_ENV !== 'test') {
  startRunWorker();
}

module.exports = {
  processRunJob,
  startRunWorker
};
