/**
 * Environment configuration validator module
 * Validates required configuration, secrets, and security policies at startup.
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

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET;

// Enforce secret complexity in production
if (nodeEnv === 'production' && jwtSecret.length < 32) {
  throw new Error('[Security Error] JWT_SECRET must be at least 32 characters in production.');
}

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'];

const config = {
  env: nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/algoforge',
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: Number(process.env.REDIS_PORT) || 6379,
  jwtSecret,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || (jwtSecret + '_rf_secret_algo'),
  backupEncryptionKey: process.env.BACKUP_ENCRYPTION_KEY || 'algoforge_aes256_backup_key_32b!',
  clientUrl,
  allowedOrigins: [...new Set(allowedOrigins)],
  googleClientId: process.env.CLIENT_ID || null,
  googleClientSecret: process.env.CLIENT_SECRET || null,
  isGoogleConfigured: Boolean(process.env.CLIENT_ID && process.env.CLIENT_SECRET),
  bodyLimit: '3mb'
};

module.exports = config;
