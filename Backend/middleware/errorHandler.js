const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Unified Typed Error Handler Middleware
 */
function errorHandler(err, req, res, _next) {
  const correlationId = req.id || 'unknown';
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong.';
  let details = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.message;
    details = Object.values(err.errors || {}).map(e => e.message);
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_IDENTIFIER';
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    // Mongo duplicate key error
    statusCode = 409;
    code = 'CONFLICT';
    const field = Object.keys(err.keyValue || {})[0] || 'resource';
    message = `Duplicate value entered for ${field}.`;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid or expired token.';
  } else if (err.status) {
    statusCode = err.status;
    message = err.message || message;
  }

  // Structured logging of the error with correlation ID
  logger.error(message, {
    correlationId,
    statusCode,
    code,
    path: req.originalUrl,
    method: req.method,
    stack: statusCode >= 500 ? err.stack : undefined
  });

  res.status(statusCode).json({
    // Standard typed error format
    error: {
      code,
      message,
      ...(details ? { details } : {})
    },
    // Backward compatibility for existing frontend and test assertions
    message,
    requestId: correlationId
  });
}

module.exports = errorHandler;
