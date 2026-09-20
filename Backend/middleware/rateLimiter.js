/**
 * Rate Limiting Middleware
 * Protects endpoints by IP and authenticated user ID, returning HTTP 429 and Retry-After.
 */

function createRateLimiter({
  windowMs = 60 * 1000,
  max = 60,
  message = 'Too many requests. Please slow down.',
  keyGenerator = null
}) {
  const store = new Map();

  // Periodic cleanup of expired windows
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, Math.max(windowMs, 30000));

  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  const defaultKeyGen = (req) => {
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    const ip = req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    return `ip:${ip}`;
  };

  const getKey = keyGenerator || defaultKeyGen;

  return function rateLimiterMiddleware(req, res, next) {
    // In test environment, allow bypassing with test header if explicitly set
    if (process.env.NODE_ENV === 'test' && req.headers['x-bypass-rate-limit'] === 'true') {
      return next();
    }

    const key = getKey(req);
    const now = Date.now();
    let record = store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      store.set(key, record);
    }

    record.count++;

    const remaining = Math.max(0, max - record.count);
    const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter: retryAfterSec
        },
        requestId: req.id
      });
    }

    next();
  };
}

// Preset Rate Limiters according to Phase 4 Threat Model
const authLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10,
  message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
});

const authRegisterLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many account registrations from this IP. Please try again after an hour.'
});

const runLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 min
  max: 30,
  message: 'Too many code execution runs. Please wait a moment before running again.'
});

const submitLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 min
  max: 15,
  message: 'Submission rate limit exceeded. Please wait before submitting again.'
});

const pollLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 min
  max: 120,
  message: 'Polling rate limit exceeded. Backing off.'
});

module.exports = {
  createRateLimiter,
  authLoginLimiter,
  authRegisterLimiter,
  runLimiter,
  submitLimiter,
  pollLimiter
};
