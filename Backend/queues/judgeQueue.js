const { Queue } = require('bullmq');
const config = require('../config/env');

const isTest = process.env.NODE_ENV === 'test';

const judgeQueue = new Queue('judge-queue', {
  connection: {
    host: config.redisHost,
    port: config.redisPort,
    maxRetriesPerRequest: isTest ? 1 : null,
    enableOfflineQueue: false,
    connectTimeout: isTest ? 1000 : 10000,
    retryStrategy: (times) => {
      if (isTest || times > 3) {
        return null;
      }
      return Math.min(times * 100, 2000);
    }
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      count: 500,
      age: 3600
    },
    removeOnFail: {
      count: 1000 // Retain failed jobs as dead-letter record for audit/reconciliation
    }
  }
});

judgeQueue.on('error', (err) => {
  if (!isTest) {
    console.error(`[JudgeQueue Error] ${err.message}`);
  }
});

module.exports = judgeQueue;