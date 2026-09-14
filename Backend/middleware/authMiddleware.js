const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { UnauthorizedError } = require('../utils/errors');

function authMiddleware(req, res, next) {
  let token = req.header('Authorization');

  if (!token) {
    return next(new UnauthorizedError('Access Denied. No token provided.'));
  }

  if (token.startsWith('Bearer ')) {
    token = token.replace('Bearer ', '');
  }

  try {
    const verified = jwt.verify(token, config.jwtSecret);
    req.user = verified;
    next();
  } catch (err) {
    return next(new UnauthorizedError('Invalid or expired token.'));
  }
}

module.exports = authMiddleware;