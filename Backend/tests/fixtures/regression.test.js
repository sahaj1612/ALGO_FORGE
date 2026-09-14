const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { FIXTURES } = require('./regressionFixtures');
const { execute, matches } = require('../../services/judge');

describe('Fixtures: Multi-Language Regression Suite', () => {
  for (const fix of FIXTURES) {
    test(`Language sandbox regression: ${fix.language}`, async () => {
      const result = await execute({
        code: fix.code,
        input: fix.input,
        language: fix.language
      });

      assert.equal(result.verdict, 'accepted', `Verdict for ${fix.language} should be accepted`);
      assert.ok(matches(result.output, fix.expected), `Expected ${fix.expected}, got ${result.output}`);
    });
  }
});
