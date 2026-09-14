const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { startTestServer, stopTestServer, request } = require('./setup');

describe('Integration: Authentication & Authorization API', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  const uniqueSuffix = crypto.randomBytes(4).toString('hex');
  const testUser = {
    name: 'QA Test User',
    email: `test_${uniqueSuffix}@algoforge.test`,
    password: 'Password12345!'
  };

  let authToken = null;

  test('POST /api/v1/auth/register creates user and returns 201 with token', async () => {
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser)
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, testUser.email);
    assert.ok(res.headers.get('x-request-id'), 'Response includes X-Request-Id');
    authToken = res.body.token;
  });

  test('POST /api/v1/auth/register rejects duplicate email with 409 Conflict', async () => {
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser)
    });

    assert.equal(res.status, 409);
    assert.ok(res.body.error);
    assert.equal(res.body.error.code, 'CONFLICT');
  });

  test('POST /api/v1/auth/register rejects short password with 400 Bad Request', async () => {
    const res = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Invalid User',
        email: 'invalid@algoforge.test',
        password: 'short'
      })
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
  });

  test('POST /api/v1/auth/login authenticates user and returns token', async () => {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, testUser.email);
  });

  test('POST /api/v1/auth/login rejects incorrect password with 401 Unauthorized', async () => {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        password: 'WrongPassword'
      })
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  test('GET /api/v1/profile returns current user profile with valid token', async () => {
    const res = await request('/api/v1/profile', {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.email, testUser.email);
  });

  test('GET /api/v1/profile rejects missing or invalid token with 401', async () => {
    const resNoToken = await request('/api/v1/profile');
    assert.equal(resNoToken.status, 401);

    const resBadToken = await request('/api/v1/profile', {
      headers: { Authorization: 'Bearer bad.token.here' }
    });
    assert.equal(resBadToken.status, 401);
  });
});
