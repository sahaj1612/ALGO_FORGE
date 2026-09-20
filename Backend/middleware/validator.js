/**
 * Allowlist Schema Validation Middleware
 * Strict validation and rejection of ambiguous contracts and unwanted properties.
 */

const { BadRequestError } = require('../utils/errors');
const { SUPPORTED_LANGUAGES } = require('../shared/constants');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateRegister(req, res, next) {
  const { name, email, password } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return next(new BadRequestError('Name must be between 2 and 100 characters.'));
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) || email.trim().length > 254) {
    return next(new BadRequestError('A valid email address is required.'));
  }

  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return next(new BadRequestError('Password must be between 8 and 128 characters.'));
  }

  req.body = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password
  };

  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return next(new BadRequestError('A valid email address is required.'));
  }

  if (!password || typeof password !== 'string' || password.length < 1) {
    return next(new BadRequestError('Password is required.'));
  }

  req.body = {
    email: email.trim().toLowerCase(),
    password
  };

  next();
}

function validateSubmission(req, res, next) {
  const { problemId, code, language } = req.body || {};

  if (!problemId || typeof problemId !== 'string' || !problemId.trim()) {
    return next(new BadRequestError('A valid problemId is required.'));
  }

  if (!code || typeof code !== 'string' || !code.trim()) {
    return next(new BadRequestError('Solution code is required.'));
  }

  if (Buffer.byteLength(code, 'utf8') > 65536) {
    return next(new BadRequestError('Solution code exceeds maximum 64KB limit.'));
  }

  const cleanLang = (language || 'javascript').toLowerCase().trim();
  if (!SUPPORTED_LANGUAGES.includes(cleanLang)) {
    return next(new BadRequestError(`Unsupported language "${language}". Supported: ${SUPPORTED_LANGUAGES.join(', ')}`));
  }

  req.body = {
    problemId: problemId.trim(),
    code,
    language: cleanLang
  };

  next();
}

function validateRun(req, res, next) {
  const rawCases = req.body?.customTestcases !== undefined ? req.body.customTestcases : req.body?.testcases;
  const { code, language, problemId } = req.body || {};

  if (!code || typeof code !== 'string' || !code.trim()) {
    return next(new BadRequestError('Solution code is required.'));
  }

  if (Buffer.byteLength(code, 'utf8') > 65536) {
    return next(new BadRequestError('Solution code exceeds maximum 64KB limit.'));
  }

  const cleanLang = (language || 'javascript').toLowerCase().trim();
  if (!SUPPORTED_LANGUAGES.includes(cleanLang)) {
    return next(new BadRequestError(`Unsupported language "${language}". Supported: ${SUPPORTED_LANGUAGES.join(', ')}`));
  }

  let cleanCases = undefined;
  if (rawCases !== undefined) {
    if (!Array.isArray(rawCases)) {
      return next(new BadRequestError('Custom testcases must be an array.'));
    }
    if (rawCases.length > 5) {
      return next(new BadRequestError('A maximum of 5 custom testcases is allowed.'));
    }
    for (const [idx, tc] of rawCases.entries()) {
      const inputVal = typeof tc === 'object' && tc !== null && 'input' in tc ? tc.input : tc;
      const inputStr = typeof inputVal === 'string' ? inputVal : JSON.stringify(inputVal ?? '');
      if (Buffer.byteLength(inputStr, 'utf8') > 10240) {
        return next(new BadRequestError(`Custom testcase #${idx + 1} input exceeds maximum size of 10KB.`));
      }
    }
    cleanCases = rawCases;
  }

  req.body = {
    code,
    language: cleanLang,
    problemId: problemId ? String(problemId).trim() : undefined,
    testcases: cleanCases,
    customTestcases: cleanCases
  };

  next();
}

function validateProblemPayload(req, res, next) {
  const allowedFields = [
    'slug', 'title', 'difficulty', 'description', 'topic', 'topics',
    'status', 'timeLimit', 'memoryLimit', 'supportedLanguages',
    'starterCode', 'signature', 'examples', 'testcases', 'hiddenTestcases',
    'inputFormat', 'outputFormat', 'constraints', 'editorial'
  ];

  const sanitized = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      sanitized[field] = req.body[field];
    }
  }

  if (sanitized.slug) {
    sanitized.slug = String(sanitized.slug).trim().toLowerCase();
    if (!SLUG_REGEX.test(sanitized.slug)) {
      return next(new BadRequestError('Slug must contain only lowercase letters, numbers, and hyphens.'));
    }
  }

  if (sanitized.difficulty && !['Easy', 'Medium', 'Hard'].includes(sanitized.difficulty)) {
    return next(new BadRequestError('Difficulty must be Easy, Medium, or Hard.'));
  }

  if (sanitized.status && !['draft', 'review', 'published', 'retired'].includes(sanitized.status)) {
    return next(new BadRequestError('Status must be draft, review, published, or retired.'));
  }

  if (sanitized.timeLimit !== undefined) {
    const tl = Number(sanitized.timeLimit);
    if (isNaN(tl) || tl < 500 || tl > 15000) {
      return next(new BadRequestError('timeLimit must be between 500ms and 15000ms.'));
    }
    sanitized.timeLimit = tl;
  }

  if (sanitized.memoryLimit !== undefined) {
    const ml = Number(sanitized.memoryLimit);
    if (isNaN(ml) || ml < 64 || ml > 1024) {
      return next(new BadRequestError('memoryLimit must be between 64MB and 1024MB.'));
    }
    sanitized.memoryLimit = ml;
  }

  req.body = sanitized;
  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateSubmission,
  validateRun,
  validateProblemPayload
};
