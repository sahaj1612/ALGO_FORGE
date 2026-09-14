/**
 * Environment configuration validator module
 * Validates required configuration at startup.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const requiredEnvVars = [
  'JWT_SECRET'
];

const missing = [];
for (const key of requiredEnvVars) {
  if (!process.env[key] || !process.env[key].trim()) {
    missing.push(key);
  }
}

if (missing.length > 0) {
  throw new Error(`[Config Error] Missing required environment variables in Backend/.env: ${missing.join(', ')}`);
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/algoforge',
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: Number(process.env.REDIS_PORT) || 6379,
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  googleClientId: process.env.CLIENT_ID || null,
  googleClientSecret: process.env.CLIENT_SECRET || null,
  isGoogleConfigured: Boolean(process.env.CLIENT_ID && process.env.CLIENT_SECRET),
  bodyLimit: '3mb'
};

module.exports = config;
