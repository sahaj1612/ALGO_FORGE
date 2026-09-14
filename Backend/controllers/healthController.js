const mongoose = require('mongoose');
const Redis = require('ioredis');
const config = require('../config/env');

let redisClient = null;
function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableReadyCheck: false
    });
    redisClient.on('error', () => {});
  }
  return redisClient;
}

async function live(req, res) {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
}

async function ready(req, res) {
  let mongoStatus = 'disconnected';
  let redisStatus = 'disconnected';

  // Check MongoDB
  if (mongoose.connection.readyState === 1) {
    mongoStatus = 'connected';
  }

  // Check Redis with 1.5s timeout guarantee
  try {
    const client = getRedisClient();
    const pong = await Promise.race([
      client.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
    ]);
    if (pong === 'PONG') {
      redisStatus = 'connected';
    }
  } catch (err) {
    redisStatus = 'disconnected';
  }

  const isReady = mongoStatus === 'connected' && redisStatus === 'connected';
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    status: isReady ? 'ready' : 'degraded',
    mongo: mongoStatus,
    redis: redisStatus,
    timestamp: new Date().toISOString()
  });
}

async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {}
    redisClient = null;
  }
}

module.exports = {
  live,
  ready,
  closeRedis
};
