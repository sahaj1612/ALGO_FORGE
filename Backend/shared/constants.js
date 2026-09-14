/**
 * Shared API Enums and DTO Constants for AlgoForge
 */

const VERDICTS = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  ACCEPTED: 'accepted',
  WRONG_ANSWER: 'wrong_answer',
  TIME_LIMIT: 'time_limit',
  RUNTIME_ERROR: 'runtime_error',
  COMPILATION_ERROR: 'compilation_error',
  SERVER_ERROR: 'server_error'
});

const TERMINAL_VERDICTS = Object.freeze(new Set([
  VERDICTS.ACCEPTED,
  VERDICTS.WRONG_ANSWER,
  VERDICTS.TIME_LIMIT,
  VERDICTS.RUNTIME_ERROR,
  VERDICTS.COMPILATION_ERROR,
  VERDICTS.SERVER_ERROR
]));

function isTerminalVerdict(status) {
  if (!status) return false;
  return TERMINAL_VERDICTS.has(String(status).toLowerCase());
}

const TESTCASE_STATUSES = Object.freeze({
  PASSED: 'passed',
  WRONG_ANSWER: 'wrong_answer',
  TIME_LIMIT: 'time_limit',
  RUNTIME_ERROR: 'runtime_error',
  COMPILATION_ERROR: 'compilation_error',
  ERROR: 'error'
});

const SUPPORTED_LANGUAGES = Object.freeze(['javascript', 'python', 'java', 'cpp', 'c']);

const PROBLEM_STATUSES = Object.freeze({
  DRAFT: 'draft',
  REVIEW: 'review',
  PUBLISHED: 'published',
  RETIRED: 'retired'
});

const DIFFICULTIES = Object.freeze(['Easy', 'Medium', 'Hard']);

module.exports = {
  VERDICTS,
  TERMINAL_VERDICTS,
  isTerminalVerdict,
  TESTCASE_STATUSES,
  SUPPORTED_LANGUAGES,
  PROBLEM_STATUSES,
  DIFFICULTIES
};
