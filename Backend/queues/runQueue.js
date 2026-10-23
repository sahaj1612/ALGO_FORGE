const { Queue } = require('bullmq');
const config = require('../config/env');

const isTest = process.env.NODE_ENV === 'test';

const runQueue = new Queue('run-queue', {
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
    attempts: 1, // Interactive runs fail fast and don't retry automatically
    timeout: 15000, // 15-second total job timeout
    removeOnComplete: {
      count: 200,
      age: 600
    },
    removeOnFail: {
      count: 200,
      age: 600
    }
  }
});

runQueue.on('error', (err) => {
  if (!isTest) {
    console.error(`[RunQueue Error] ${err.message}`);
  }
});

module.exports = runQueue;
