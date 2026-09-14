const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const { execute, matches, LANGUAGES } = require('./judge');
const { BadRequestError, NotFoundError, PayloadTooLargeError } = require('../utils/errors');
const { SUPPORTED_LANGUAGES } = require('../shared/constants');

async function executeRun({ code, problemId, language = 'javascript', input, testcases: clientCases }) {
  if (!code?.trim() || !problemId) {
    throw new BadRequestError('Code and problemId are required.');
  }

  const cleanLang = language.toLowerCase();
  if (!SUPPORTED_LANGUAGES.includes(cleanLang) || !LANGUAGES[cleanLang]) {
    throw new BadRequestError(`Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }

  // Enforce caps before DB lookup
  if (Array.isArray(clientCases) && clientCases.length > 0) {
    if (clientCases.length > 5) {
      throw new BadRequestError('A maximum of 5 custom testcases is permitted per run.');
    }
    const totalSize = JSON.stringify(clientCases).length;
    if (totalSize > 10 * 1024) {
      throw new PayloadTooLargeError('Custom testcases exceed the maximum allowed payload of 10 KB.');
    }
  } else if (input !== undefined && input !== null) {
    if (JSON.stringify(input).length > 10 * 1024) {
      throw new PayloadTooLargeError('Custom input exceeds 10 KB.');
    }
  }

  let problem = null;
  const cleanId = String(problemId).trim();
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    problem = await Problem.findById(cleanId);
  }
  if (!problem) {
    problem = await Problem.findOne({ slug: cleanId.toLowerCase() });
  }
  if (!problem) {
    throw new NotFoundError('Problem not found.');
  }

  let cases = [];
  if (Array.isArray(clientCases) && clientCases.length > 0) {
    cases = clientCases.map(item => {
      const rawInput = typeof item === 'object' && item.input !== undefined ? item.input : item;
      const matched = (problem.testcases || []).find(tc =>
        matches(JSON.stringify(tc.input), JSON.stringify(rawInput)) ||
        matches(String(tc.input), String(rawInput))
      );
      return {
        input: rawInput,
        output: typeof item === 'object' && item.output !== undefined ? item.output : (matched ? matched.output : null)
      };
    });
  } else if (input !== undefined && input !== null) {
    if (JSON.stringify(input).length > 10 * 1024) {
      throw new PayloadTooLargeError('Custom input exceeds 10 KB.');
    }
    const matched = (problem.testcases || []).find(tc =>
      matches(JSON.stringify(tc.input), JSON.stringify(input)) ||
      matches(String(tc.input), String(input))
    );
    cases = [{ input, output: matched ? matched.output : null }];
  } else {
    cases = problem.testcases || [];
  }

  const results = [];
  let ordinal = 1;
  for (const test of cases) {
    const result = await execute({
      code,
      input: test.input,
      language: cleanLang,
      timeLimit: problem.timeLimit || 4000,
      memoryLimit: problem.memoryLimit || 256
    });

    let status;
    if (result.verdict !== 'accepted') {
      status = result.verdict;
    } else if (test.output !== null && test.output !== undefined) {
      status = matches(result.output, test.output) ? 'passed' : 'wrong_answer';
    } else {
      status = 'accepted';
    }

    results.push({
      ordinal,
      input: typeof test.input === 'object' ? JSON.stringify(test.input) : String(test.input),
      expected: test.output != null ? String(test.output) : null,
      got: result.output || '',
      status,
      error: result.error,
      time: result.time,
      memory: result.memory
    });

    ordinal++;
    if (result.verdict !== 'accepted') break;
  }

  return { results };
}

module.exports = {
  executeRun
};
