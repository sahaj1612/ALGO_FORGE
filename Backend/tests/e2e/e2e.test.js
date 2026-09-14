process.env.NODE_ENV = 'test';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { startTestServer, stopTestServer, request } = require('../integration/setup');
const { processSubmissionJob } = require('../../workers/judgeWorker');

describe('E2E: Complete Online Judge User Journey', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  const uniqueSuffix = crypto.randomBytes(4).toString('hex');
  const userPayload = {
    name: `E2E Coder ${uniqueSuffix}`,
    email: `coder_${uniqueSuffix}@algoforge.e2e`,
    password: 'SuperSecret123!'
  };

  let token = null;
  let targetProblem = null;
  let submissionId = null;

  test('Step 1: User registers an account', async () => {
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userPayload)
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, userPayload.email);
    token = res.body.token;
  });

  test('Step 2: User logs in to verify credentials', async () => {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: userPayload.email,
        password: userPayload.password
      })
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    token = res.body.token;
  });

  test('Step 3: User browses published problem list and inspects problem details', async () => {
    const listRes = await request('/api/v1/problems?limit=10');
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.items.length > 0);

    targetProblem = listRes.body.items.find(p => p.slug === 'two-sum') || listRes.body.items[0];
    assert.ok(targetProblem);

    const detailRes = await request(`/api/v1/problems/${targetProblem.slug}`);
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.body.slug, targetProblem.slug);
    assert.equal(detailRes.body.hiddenTestcases, undefined, 'Confidential testcases omitted');
  });

  test('Step 4: User executes public run against sample testcases', async () => {
    const runRes = await request('/api/v1/run', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        problemId: targetProblem.slug,
        language: 'javascript',
        code: 'function solve(nums, target) { const map = new Map(); for (let i = 0; i < nums.length; i++) { const diff = target - nums[i]; if (map.has(diff)) return [map.get(diff), i]; map.set(nums[i], i); } return []; }'
      })
    });

    assert.equal(runRes.status, 200);
    assert.ok(Array.isArray(runRes.body.results));
    assert.ok(runRes.body.results.length > 0);
  });

  test('Step 5: User submits solution and receives HTTP 202 Accepted', async () => {
    const subRes = await request('/api/v1/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        problemId: targetProblem.slug,
        language: 'javascript',
        code: 'function solve(nums, target) { const map = new Map(); for (let i = 0; i < nums.length; i++) { const diff = target - nums[i]; if (map.has(diff)) return [map.get(diff), i]; map.set(nums[i], i); } return []; }'
      })
    });

    assert.equal(subRes.status, 202);
    assert.ok(subRes.body.id);
    assert.equal(subRes.body.status, 'pending');
    assert.equal(subRes.body.pollAfterMs, 1000);
    submissionId = subRes.body.id;
  });

  test('Step 6: Worker processes submission and poll returns terminal accepted verdict', async () => {
    // Process the submission job (simulates worker queue consumption)
    await processSubmissionJob({ submissionId, jobId: 'e2e-job-1' });

    // Poll endpoint to inspect final state
    const pollRes = await request(`/api/v1/submissions/${submissionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(pollRes.status, 200);
    assert.equal(pollRes.body.id, submissionId);
    assert.equal(pollRes.body.status, 'accepted');
    assert.equal(pollRes.body.isTerminal, true);
    assert.equal(pollRes.body.problemVersion, 1);
  });

  test('Step 7: User inspects their submission history and finds recorded verdict', async () => {
    const historyRes = await request('/api/v1/submissions', {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(historyRes.status, 200);
    assert.ok(historyRes.body.items.length >= 1);
    const recorded = historyRes.body.items.find(s => s._id === submissionId);
    assert.ok(recorded, 'Submission is present in history');
    assert.equal(recorded.status, 'accepted');
  });

  test('Step 8: User stats reflect the accepted problem solve', async () => {
    const statsRes = await request('/api/v1/user/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(statsRes.status, 200);
    assert.ok(statsRes.body.solvedCount >= 1);
  });
});
