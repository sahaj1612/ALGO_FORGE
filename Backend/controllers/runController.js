const runService = require('../services/runService');

async function runCode(req, res, next) {
  try {
    const { code, problemId, language = 'javascript', input, testcases } = req.body;
    const result = await runService.executeRun({
      code,
      problemId,
      language,
      input,
      testcases
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  runCode
};
