const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { normalize, matches } = require('../../services/judge');

describe('Unit: Output Normalization & Matcher', () => {
  test('normalizes identical strings and ignores trailing whitespace', () => {
    assert.equal(normalize('hello  \n'), 'hello');
    assert.equal(matches('hello  \r\n', 'hello'), true);
  });

  test('normalizes CRLF to LF', () => {
    assert.equal(normalize('line1\r\nline2'), 'line1\nline2');
    assert.equal(matches('line1\r\nline2', 'line1\nline2'), true);
  });

  test('normalizes JSON numbers, strings, and arrays', () => {
    assert.equal(matches('[1, 2, 3]', '[1,2,3]'), true);
    assert.equal(matches('{"a": 1, "b": 2}', '{"b": 2, "a": 1}'), true);
    assert.equal(matches('true', 'true'), true);
    assert.equal(matches('false', 'false'), true);
  });

  test('matches numbers with floating point precision tolerance', () => {
    assert.equal(matches('3.1415926', '3.1415927'), true); // diff < 1e-5
    assert.equal(matches('10', '10.0'), true);
    assert.equal(matches('5', '6'), false);
  });

  test('handles null, undefined, and empty string safely', () => {
    assert.equal(normalize(null), '');
    assert.equal(normalize(undefined), '');
    assert.equal(matches('', ''), true);
    assert.equal(matches(null, ''), true);
    assert.equal(matches('42', ''), false);
  });

  test('case-insensitive match for boolean/string verdicts', () => {
    assert.equal(matches('True', 'true'), true);
    assert.equal(matches('FALSE', 'false'), true);
  });
});
