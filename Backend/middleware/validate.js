const { BadRequestError, ValidationError } = require('../utils/errors');

/**
 * Higher-order middleware to run a validation function on req.body, req.query, or req.params
 * @param {Function} validatorFn - Function receiving req and returning array of error messages or throwing
 */
function validate(validatorFn) {
  return (req, res, next) => {
    try {
      const errors = validatorFn(req);
      if (errors && Array.isArray(errors) && errors.length > 0) {
        return next(new ValidationError(errors[0], errors));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
