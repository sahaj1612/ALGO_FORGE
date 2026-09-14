const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { executeRun } = require('../../services/runService');
const { SUPPORTED_LANGUAGES } = require('../../shared/constants');
const { BadRequestError, PayloadTooLargeError } = require('../../utils/errors');

describe('Unit: Validators & Caps', () => {
  test('rejects empty or missing code and problemId', async () => {
    await assert.rejects(
      async () => executeRun({ code: '', problemId: 'two-sum' }),
      (err) => err instanceof BadRequestError && err.message.includes('Code and problemId are required')
    );

    await assert.rejects(
      async () => executeRun({ code: 'function solve() {}', problemId: '' }),
      (err) => err instanceof BadRequestError && err.message.includes('Code and problemId are required')
    );
  });

  test('rejects unsupported execution languages', async () => {
    await assert.rejects(
      async () => executeRun({
        code: 'function solve() {}',
        problemId: 'two-sum',
        language: 'ruby'
      }),
      (err) => err instanceof BadRequestError && err.message.includes('Unsupported language')
    );
  });

  test('accepts all 5 supported languages in constants', () => {
    const expected = ['javascript', 'python', 'java', 'cpp', 'c'];
    assert.deepEqual(Array.from(SUPPORTED_LANGUAGES), expected);
  });

  test('enforces custom testcases count limit of 5', async () => {
    const sixCases = [1, 2, 3, 4, 5, 6];
    await assert.rejects(
      async () => executeRun({
        code: 'function solve() {}',
        problemId: 'two-sum',
        testcases: sixCases
      }),
      (err) => err instanceof BadRequestError && err.message.includes('maximum of 5')
    );
  });

  test('enforces 10 KB payload size limit', async () => {
    const oversizedPayload = new Array(300).fill('a'.repeat(40));
    await assert.rejects(
      async () => executeRun({
        code: 'function solve() {}',
        problemId: 'two-sum',
        testcases: oversizedPayload
      }),
      (err) => (err instanceof BadRequestError || err instanceof PayloadTooLargeError)
    );
  });
});
