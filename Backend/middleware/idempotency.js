/**
 * Idempotency Middleware for Mutating / Execution Endpoints
 * Prevents network retries or double-clicks from creating duplicate judge jobs and submissions.
 */

const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
const idempotencyStore = new Map();

// Periodic purge of expired keys
const timer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 60000);

if (typeof timer.unref === 'function') {
  timer.unref();
}

function idempotencyMiddleware(req, res, next) {
  const rawKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
    return next();
  }

  const key = `${req.user?.id || 'anon'}:${rawKey.trim()}`;
  const now = Date.now();
  const existing = idempotencyStore.get(key);

  if (existing && now - existing.timestamp < IDEMPOTENCY_TTL_MS) {
    if (existing.status === 'in_flight') {
      return res.status(409).json({
        error: {
          code: 'IDEMPOTENT_REQUEST_IN_FLIGHT',
          message: 'A request with this idempotency key is currently in flight.'
        },
        requestId: req.id
      });
    }

    if (existing.status === 'completed') {
      res.setHeader('X-Idempotent-Replay', 'true');
      return res.status(existing.statusCode).json(existing.body);
    }
  }

  // Mark in-flight
  idempotencyStore.set(key, {
    status: 'in_flight',
    timestamp: now
  });

  // Intercept response to capture and cache result
  const originalJson = res.json.bind(res);
  res.json = function interceptedJson(body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyStore.set(key, {
        status: 'completed',
        statusCode: res.statusCode,
        body,
        timestamp: Date.now()
      });
    } else {
      // In case of error response, clear key so client can retry
      idempotencyStore.delete(key);
    }
    return originalJson(body);
  };

  next();
}

module.exports = idempotencyMiddleware;
