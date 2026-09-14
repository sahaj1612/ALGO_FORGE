const submissionService = require('../services/submissionService');

async function createSubmission(req, res, next) {
  try {
    const { problemId, code, language = 'javascript' } = req.body;
    const result = await submissionService.createSubmission({
      userId: req.user.id,
      problemId,
      code,
      language
    });
    // Deliverable 4 / API contract: Return HTTP 202 Accepted
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

async function getSubmission(req, res, next) {
  try {
    const result = await submissionService.getSubmissionById(req.params.id, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function listSubmissions(req, res, next) {
  try {
    const result = await submissionService.getUserSubmissions(req.user.id, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSubmission,
  getSubmission,
  listSubmissions
};
