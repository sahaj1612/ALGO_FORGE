const problemService = require('../services/problemService');
const auditService = require('../services/auditService');
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

    await auditService.recordAuditLog({
      actor: req.user,
      action: 'PROBLEM_CREATE',
      targetType: 'Problem',
      targetId: problem._id,
      details: { slug: problem.slug, title: problem.title, status: problem.status },
      req
    });

    res.status(201).json(problem);
  } catch (error) {
    next(error);
  }
}

async function updateProblemAdmin(req, res, next) {
  try {
    const problem = await problemService.updateProblemAdmin(req.params.id, req.body);

    const action = req.body.status === 'published' ? 'PROBLEM_PUBLISH' : 'PROBLEM_UPDATE';

    await auditService.recordAuditLog({
      actor: req.user,
      action,
      targetType: 'Problem',
      targetId: problem._id,
      details: { slug: problem.slug, title: problem.title, status: problem.status, version: problem.version },
      req
    });

    res.json(problem);
  } catch (error) {
    next(error);
  }
}

async function retireProblemAdmin(req, res, next) {
  try {
    const problem = await problemService.retireProblemAdmin(req.params.id);

    await auditService.recordAuditLog({
      actor: req.user,
      action: 'PROBLEM_RETIRE',
      targetType: 'Problem',
      targetId: problem._id,
      details: { slug: problem.slug, title: problem.title, status: 'retired' },
      req
    });

    res.json({ message: 'Problem status updated to retired.', problem });
  } catch (error) {
    next(error);
  }
}

async function deleteProblemAdmin(req, res, next) {
  try {
    const problem = await problemService.deleteProblemAdmin(req.params.id);

    await auditService.recordAuditLog({
      actor: req.user,
      action: 'PROBLEM_DELETE',
      targetType: 'Problem',
      targetId: req.params.id,
      details: { slug: problem.slug, title: problem.title },
      req
    });

    res.json({ message: 'Problem deleted permanently.', id: req.params.id });
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
  retireProblemAdmin,
  deleteProblemAdmin
};
