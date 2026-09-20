const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Problem = require('../../models/Problem');
const Submission = require('../../models/Submission');
const AuditLog = require('../../models/AuditLog');
const { startTestServer, stopTestServer, request } = require('./setup');
const config = require('../../config/env');

describe('Integration: Phase 4 Security and Multi-Tenant Boundaries', () => {
  let userToken = null;
  let userObj = null;
  let adminToken = null;
  let adminObj = null;
  let sampleProblem = null;

  before(async () => {
    await startTestServer();

    // Regular user
    userObj = await User.create({
      name: 'Regular Security Tester',
      email: `reg_sec_${Date.now()}@algoforge.test`,
      passwordHash: 'dummy:hash',
      role: 'user'
    });
    userToken = jwt.sign({ id: userObj._id.toString() }, config.jwtSecret);

    // Admin user
    adminObj = await User.create({
      name: 'Admin Security Tester',
      email: `admin_sec_${Date.now()}@algoforge.test`,
      passwordHash: 'dummy:hash',
      role: 'admin'
    });
    adminToken = jwt.sign({ id: adminObj._id.toString() }, config.jwtSecret);

    sampleProblem = await Problem.create({
      slug: `sec-problem-${Date.now()}`,
      title: 'Security Evaluation Problem',
      difficulty: 'Easy',
      topic: 'Arrays',
      description: 'Find target',
      status: 'published',
      hiddenTestcases: [{ input: [1, 2], output: '3' }],
      version: 1
    });
  });

  after(async () => {
    if (sampleProblem) await Problem.findByIdAndDelete(sampleProblem._id);
    if (userObj) await User.findByIdAndDelete(userObj._id);
    if (adminObj) await User.findByIdAndDelete(adminObj._id);
    await stopTestServer();
  });

  test('Security Headers: all responses enforce HSTS, nosniff, frame denial, and CSP', async () => {
    const res = await request('/health');
    assert.equal(res.status, 200);

    const headers = res.headers;
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    assert.equal(headers.get('x-frame-options'), 'DENY');
    assert.ok(headers.get('strict-transport-security')?.includes('max-age=31536000'));
    assert.ok(headers.get('content-security-policy')?.includes("default-src 'self'"));
  });

  test('Rate Limiting: excessive login requests trigger HTTP 429 with Retry-After header', async () => {
    let lastRes = null;
    // authLoginLimiter allows max 10 attempts
    for (let i = 0; i < 12; i++) {
      lastRes = await request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'rate_test@test.com', password: 'password123' })
      });
      if (lastRes.status === 429) break;
    }

    assert.equal(lastRes.status, 429);
    assert.equal(lastRes.body.error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(lastRes.headers.get('retry-after'), 'Must include standard Retry-After header');
  });

  test('Idempotency: duplicate submission with same Idempotency-Key returns cached 202 without duplicate records', async () => {
    const idempotencyKey = `idem-${Date.now()}-${Math.random()}`;

    const res1 = await request('/api/v1/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Idempotency-Key': idempotencyKey,
        'X-Bypass-Rate-Limit': 'true'
      },
      body: JSON.stringify({
        problemId: sampleProblem.slug,
        language: 'javascript',
        code: 'function solve() { return 3; }'
      })
    });

    assert.equal(res1.status, 202);
    const subId1 = res1.body.id;
    assert.ok(subId1);

    // Replay exact same request with identical idempotency key
    const res2 = await request('/api/v1/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Idempotency-Key': idempotencyKey,
        'X-Bypass-Rate-Limit': 'true'
      },
      body: JSON.stringify({
        problemId: sampleProblem.slug,
        language: 'javascript',
        code: 'function solve() { return 3; }'
      })
    });

    assert.equal(res2.status, 202);
    assert.equal(res2.body.id, subId1, 'Must return same submission ID without creating a duplicate');
    assert.equal(res2.headers.get('x-idempotent-replay'), 'true');
  });

  test('Queue Protection: user exceeding concurrent submission limit receives HTTP 429', async () => {
    // Manually ensure user has 3 active submissions
    await Submission.create([
      { userId: userObj._id, problemId: sampleProblem._id, code: 'a', status: 'pending' },
      { userId: userObj._id, problemId: sampleProblem._id, code: 'b', status: 'pending' },
      { userId: userObj._id, problemId: sampleProblem._id, code: 'c', status: 'running' }
    ]);

    // 4th submission must be rejected
    const res = await request('/api/v1/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'X-Bypass-Rate-Limit': 'true'
      },
      body: JSON.stringify({
        problemId: sampleProblem.slug,
        language: 'javascript',
        code: 'function solve() { return 1; }'
      })
    });

    assert.equal(res.status, 429);
    assert.equal(res.body.error.code, 'CONCURRENCY_LIMIT_EXCEEDED');
    assert.ok(res.headers.get('retry-after'));

    // Clean up created pending submissions
    await Submission.deleteMany({ userId: userObj._id, status: { $in: ['pending', 'running'] } });
  });

  test('Role-Based Authorization: non-admin cannot author problems, admin operations are audited', async () => {
    // 1. Regular user rejected with 403
    const rejectedRes = await request('/api/v1/problems/admin', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'X-Bypass-Rate-Limit': 'true'
      },
      body: JSON.stringify({
        slug: `unauth-${Date.now()}`,
        title: 'Unauth Problem',
        difficulty: 'Easy',
        description: 'None'
      })
    });
    assert.equal(rejectedRes.status, 403);

    // 2. Admin creates problem
    const adminSlug = `admin-test-${Date.now()}`;
    const createRes = await request('/api/v1/problems/admin', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'X-Bypass-Rate-Limit': 'true'
      },
      body: JSON.stringify({
        slug: adminSlug,
        title: 'Admin Created Problem',
        difficulty: 'Medium',
        description: 'Detailed description for test',
        status: 'published'
      })
    });

    assert.equal(createRes.status, 201);
    const createdId = createRes.body._id;

    // 3. Verify audit log was created
    const auditEntry = await AuditLog.findOne({ targetId: createdId, action: 'PROBLEM_CREATE' });
    assert.ok(auditEntry, 'PROBLEM_CREATE audit log must be persisted');
    assert.equal(auditEntry.actorEmail, adminObj.email);

    // 4. Admin query audit logs endpoint
    const logsRes = await request('/api/v1/admin/audit-logs?limit=5', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'X-Bypass-Rate-Limit': 'true'
      }
    });

    assert.equal(logsRes.status, 200);
    assert.ok(Array.isArray(logsRes.body.items));
    assert.ok(logsRes.body.items.some(log => log.targetId === createdId));

    // Clean up created problem
    await Problem.findByIdAndDelete(createdId);
    await AuditLog.deleteMany({ targetId: createdId });
  });

  test('GDPR Data Retention: GET /api/v1/user/export exports complete account data in structured format', async () => {
    const exportRes = await request('/api/v1/user/export', {
      headers: {
        Authorization: `Bearer ${userToken}`,
        'X-Bypass-Rate-Limit': 'true'
      }
    });

    assert.equal(exportRes.status, 200);
    assert.ok(exportRes.body.exportMetadata);
    assert.equal(exportRes.body.user.email, userObj.email);
    assert.ok(Array.isArray(exportRes.body.submissions));
  });

  test('Right to Erasure: DELETE /api/v1/user/account permanently deletes user and personal data', async () => {
    // Create dedicated deletion test user
    const deleteUser = await User.create({
      name: 'To Be Deleted',
      email: `delete_me_${Date.now()}@algoforge.test`,
      passwordHash: 'dummy:hash'
    });
    const deleteToken = jwt.sign({ id: deleteUser._id.toString() }, config.jwtSecret);

    const deleteRes = await request('/api/v1/user/account', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${deleteToken}`,
        'X-Bypass-Rate-Limit': 'true'
      }
    });

    assert.equal(deleteRes.status, 200);

    // Verify user no longer exists in database
    const userInDb = await User.findById(deleteUser._id);
    assert.equal(userInDb, null, 'User document must be permanently deleted');
  });
});
