const User = require('../models/User');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

async function adminMiddleware(req, res, next) {
  if (!req.user || !req.user.id) {
    return next(new UnauthorizedError('Authentication required.'));
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return next(new ForbiddenError('Administrator access required.'));
    }
    req.adminUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = adminMiddleware;
