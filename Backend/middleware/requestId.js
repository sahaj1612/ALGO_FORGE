const crypto = require('crypto');

/**
 * Request correlation ID middleware
 * Attaches a correlation ID to each incoming request and propagates it in response headers.
 */
function requestIdMiddleware(req, res, next) {
  const correlationId = req.header('x-request-id') || crypto.randomUUID();
  req.id = correlationId;
  res.setHeader('X-Request-Id', correlationId);
  next();
}

module.exports = requestIdMiddleware;
