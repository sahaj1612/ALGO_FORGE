/**
 * Structured JSON Logger with Sensitive Field Redaction & Correlation Tracking
 */

const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'authorization',
  'jwt_secret',
  'client_secret',
  'code',
  'secret'
]);

function sanitize(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 5) return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitize(item, depth + 1));

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (REDACTED_KEYS.has(lowerKey)) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitize(value, depth + 1);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function createLogEntry(level, message, meta = {}) {
  const { correlationId, submissionId, ...rest } = meta;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(correlationId ? { correlationId } : {}),
    ...(submissionId ? { submissionId } : {}),
    ...(Object.keys(rest).length > 0 ? { meta: sanitize(rest) } : {})
  };
  return JSON.stringify(entry);
}

const logger = {
  info(message, meta) {
    console.log(createLogEntry('info', message, meta));
  },
  warn(message, meta) {
    console.warn(createLogEntry('warn', message, meta));
  },
  error(message, meta) {
    console.error(createLogEntry('error', message, meta));
  },
  debug(message, meta) {
    if (process.env.DEBUG || process.env.NODE_ENV === 'test') {
      console.log(createLogEntry('debug', message, meta));
    }
  },
  sanitize
};

module.exports = logger;
