const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Submission = require('../../models/Submission');
const { startTestServer, stopTestServer, request } = require('./setup');
const config = require('../../config/env');

describe('Integration: Submit & Submissions API', () => {
  let user1Token = null;
  let user1Id = null;
  let user2Token = null;
  let submissionId = null;

  before(async () => {
    await startTestServer();

    user1Id = new mongoose.Types.ObjectId();
    const user1 = await User.create({
      _id: user1Id,
      name: 'Submit User 1',
      email: `sub_user_1_${Date.now()}@algoforge.test`,
      passwordHash: 'dummy:hash'
    });
    user1Token = jwt.sign({ id: user1._id.toString() }, config.jwtSecret);

    const user2 = await User.create({
      name: 'Submit User 2',
      email: `sub_user_2_${Date.now()}@algoforge.test`,
      passwordHash: 'dummy:hash'
    });
    user2Token = jwt.sign({ id: user2._id.toString() }, config.jwtSecret);
  });

  after(async () => {
    await stopTestServer();
  });

  test('POST /api/v1/submit returns HTTP 202 Accepted with pending status and pollAfterMs', async () => {
    const res = await request('/api/v1/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
      body: JSON.stringify({
        problemId: 'two-sum',
        language: 'javascript',
        code: 'function solve(nums, target) { return [0, 1]; }'
      })
    });

    assert.equal(res.status, 202);
    assert.ok(res.body.id);
    assert.equal(res.body.status, 'pending');
    assert.equal(res.body.pollAfterMs, 1000);
    submissionId = res.body.id;
  });

  test('submission document persists problemVersion snapshot', async () => {
    const sub = await Submission.findById(submissionId);
    assert.ok(sub);
    assert.equal(sub.problemVersion, 1);
    assert.ok(['pending', 'running', 'accepted'].includes(sub.status), `Status was ${sub.status}`);
  });

  test('GET /api/v1/submissions/:id succeeds for submission owner', async () => {
    const res = await request(`/api/v1/submissions/${submissionId}`, {
      headers: { Authorization: `Bearer ${user1Token}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.id, submissionId);
    assert.ok('isTerminal' in res.body);
  });

  test('GET /api/v1/submissions/:id rejects unauthorized user with 403 Forbidden', async () => {
    const res = await request(`/api/v1/submissions/${submissionId}`, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  test('GET /api/v1/submissions returns cursor paginated list with total', async () => {
    const res = await request('/api/v1/submissions?limit=5', {
      headers: { Authorization: `Bearer ${user1Token}` }
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items));
    assert.ok('total' in res.body);
  });
});
