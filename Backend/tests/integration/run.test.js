const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../models/User');
const { startTestServer, stopTestServer, request } = require('./setup');
const config = require('../../config/env');

describe('Integration: Public Run API', () => {
  let authToken = null;

  before(async () => {
    await startTestServer();
    const user = await User.findOne({}) || await User.create({
      name: 'Run Test User',
      email: `run_tester_${Date.now()}@algoforge.test`,
      passwordHash: 'dummy:hash'
    });
    authToken = jwt.sign({ id: user._id.toString() }, config.jwtSecret);
  });

  after(async () => {
    await stopTestServer();
  });

  test('POST /api/v1/run rejects unauthenticated request with 401', async () => {
    const res = await request('/api/v1/run', {
      method: 'POST',
      body: JSON.stringify({
        code: 'function solve() {}',
        problemId: 'two-sum'
      })
    });
    assert.equal(res.status, 401);
  });

  test('POST /api/v1/run rejects > 5 custom testcases with 400', async () => {
    const res = await request('/api/v1/run', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        code: 'function solve() {}',
        problemId: 'two-sum',
        testcases: [1, 2, 3, 4, 5, 6]
      })
    });

    assert.equal(res.status, 400);
    assert.ok(res.body.message.includes('maximum of 5'));
  });

  test('POST /api/v1/run executes valid JavaScript against problem testcase', async () => {
    const res = await request('/api/v1/run', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        code: 'function solve(nums) { return Math.max(...nums); }',
        problemId: 'find-maximum-element',
        language: 'javascript'
      })
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.results), 'returns results array');
    assert.ok(res.body.results.length > 0);
    assert.ok(res.body.results[0].status);
  });
});
