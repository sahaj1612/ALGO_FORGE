const problemService = require('../services/problemService');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

function getOptionalUserId(req) {
  let token = req.header('Authorization');
  if (!token) return null;
  if (token.startsWith('Bearer ')) token = token.replace('Bearer ', '');
  try {
    const verified = jwt.verify(token, config.jwtSecret);
    return verified.id || null;
  } catch {
    return null;
  }
}

async function listProblems(req, res, next) {
  try {
    const userId = getOptionalUserId(req);
    const result = await problemService.getProblems(req.query, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getProblemDetail(req, res, next) {
  try {
    const problem = await problemService.getProblemBySlugOrId(req.params.slug);
    res.json(problem);
  } catch (error) {
    next(error);
  }
}

async function listAllProblemsAdmin(req, res, next) {
  try {
    const problems = await problemService.getAllProblemsAdmin();
    res.json(problems);
  } catch (error) {
    next(error);
  }
}

async function createProblemAdmin(req, res, next) {
  try {
    const problem = await problemService.createProblemAdmin(req.body);
    res.status(201).json(problem);
  } catch (error) {
    next(error);
  }
}

async function updateProblemAdmin(req, res, next) {
  try {
    const problem = await problemService.updateProblemAdmin(req.params.id, req.body);
    res.json(problem);
  } catch (error) {
    next(error);
  }
}

async function retireProblemAdmin(req, res, next) {
  try {
    const problem = await problemService.retireProblemAdmin(req.params.id);
    res.json({ message: 'Problem status updated to retired.', problem });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProblems,
  getProblemDetail,
  listAllProblemsAdmin,
  createProblemAdmin,
  updateProblemAdmin,
  retireProblemAdmin
};
