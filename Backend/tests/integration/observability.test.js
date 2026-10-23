const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Problem = require('../../models/Problem');
const Submission = require('../../models/Submission');
const { startTestServer, stopTestServer, request } = require('./setup');
const config = require('../../config/env');

describe('Integration: Phase 5 Observability, Metrics & Queue Platform', () => {
  let userToken = null;
  let userObj = null;
  let sampleProblem = null;

  before(async () => {
    await startTestServer();

    userObj = await User.create({
      name: 'Observability Test User',
      email: `obs_${Date.now()}@algoforge.test`,
      passwordHash: 'dummy:hash'
    });
    userToken = jwt.sign({ id: userObj._id.toString() }, config.jwtSecret);

    sampleProblem = await Problem.create({
      slug: `obs-problem-${Date.now()}`,
      title: 'Observability Problem',
      difficulty: 'Easy',
      status: 'published',
      testcases: [{ input: [1, 2], output: '3' }]
    });
  });

  after(async () => {
    if (sampleProblem) await Problem.findByIdAndDelete(sampleProblem._id);
    if (userObj) await User.findByIdAndDelete(userObj._id);
    await Submission.deleteMany({ userId: userObj?._id });
    await stopTestServer();
  });

  test('Prometheus /metrics endpoint returns valid text exposition format', async () => {
    const res = await request('/metrics');
    assert.equal(res.status, 200);

    const contentType = res.headers.get('content-type');
    assert.ok(contentType?.includes('text/plain'));

    const text = res.raw;
    assert.ok(text.includes('algoforge_uptime_seconds'));
    assert.ok(text.includes('algoforge_http_requests_total'));
    assert.ok(text.includes('algoforge_queue_depth'));
    assert.ok(text.includes('algoforge_submissions_total'));
  });

  test('Structured JSON /api/v1/metrics endpoint returns full telemetry snapshot', async () => {
    const res = await request('/api/v1/metrics');
    assert.equal(res.status, 200);

    const data = res.body;
    assert.ok(data.timestamp);
    assert.equal(typeof data.uptimeSeconds, 'number');

    // HTTP telemetry
    assert.ok(data.http);
    assert.equal(typeof data.http.totalRequests, 'number');
    assert.equal(typeof data.http.p95LatencyMs, 'number');
    assert.ok(data.http.statusCounts['2xx'] !== undefined);

    // Queue telemetry
    assert.ok(data.queues);
    assert.ok(data.queues.judgeQueue);
    assert.ok(data.queues.runQueue);

    // System telemetry
    assert.ok(data.system);
    assert.ok(data.system.memoryRssMb > 0);
  });

  test('End-to-End Tracing: submission persists correlation ID and heartbeat in database', async () => {
    const customCorrelationId = `test-corr-${Date.now()}`;

    const res = await request('/api/v1/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'X-Request-Id': customCorrelationId,
        'X-Bypass-Rate-Limit': 'true'
      },
      body: JSON.stringify({
        problemId: sampleProblem.slug,
        language: 'javascript',
        code: 'function solve() { return 3; }'
      })
    });

    assert.equal(res.status, 202);
    const subId = res.body.id;
    assert.ok(subId);

    const doc = await Submission.findById(subId);
    assert.ok(doc.heartbeatAt, 'heartbeatAt must be initialized on submission');
    assert.equal(doc.correlationId, customCorrelationId, 'correlationId must be tracked in submission document');
  });

  test('Interactive run executes and records telemetry', async () => {
    const res = await request('/api/v1/run', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'X-Bypass-Rate-Limit': 'true'
      },
      body: JSON.stringify({
        problemId: sampleProblem.slug,
        language: 'javascript',
        code: 'function solve(nums) { return 3; }'
      })
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.results));
  });
});
