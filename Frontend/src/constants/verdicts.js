/**
 * Shared API Enums and DTO Constants for Frontend
 */

export const VERDICTS = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  ACCEPTED: 'accepted',
  WRONG_ANSWER: 'wrong_answer',
  TIME_LIMIT: 'time_limit',
  RUNTIME_ERROR: 'runtime_error',
  COMPILATION_ERROR: 'compilation_error',
  SERVER_ERROR: 'server_error'
});

export const TERMINAL_VERDICTS = Object.freeze(new Set([
  VERDICTS.ACCEPTED,
  VERDICTS.WRONG_ANSWER,
  VERDICTS.TIME_LIMIT,
  VERDICTS.RUNTIME_ERROR,
  VERDICTS.COMPILATION_ERROR,
  VERDICTS.SERVER_ERROR
]));

export function isTerminalVerdict(status) {
  if (!status) return false;
  return TERMINAL_VERDICTS.has(String(status).toLowerCase());
}

export const TESTCASE_STATUSES = Object.freeze({
  PASSED: 'passed',
  WRONG_ANSWER: 'wrong_answer',
  TIME_LIMIT: 'time_limit',
  RUNTIME_ERROR: 'runtime_error',
  COMPILATION_ERROR: 'compilation_error',
  ERROR: 'error'
});

export const SUPPORTED_LANGUAGES = Object.freeze(['javascript', 'python', 'java', 'cpp', 'c']);

export const PROBLEM_STATUSES = Object.freeze({
  DRAFT: 'draft',
  REVIEW: 'review',
  PUBLISHED: 'published',
  RETIRED: 'retired'
});

export const DIFFICULTIES = Object.freeze(['Easy', 'Medium', 'Hard']);
