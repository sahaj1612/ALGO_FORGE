const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request } = require('./setup');

describe('Integration: Health Probes', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  test('GET /health/live returns 200 process alive probe', async () => {
    const res = await request('/health/live');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(typeof res.body.uptime === 'number');
    assert.ok(res.body.timestamp);
  });

  test('GET /health/ready returns readiness probe checking mongo and redis', async () => {
    const res = await request('/health/ready');
    assert.ok(res.status === 200 || res.status === 503);
    assert.ok(res.body.mongo === 'connected' || res.body.mongo === 'disconnected');
    assert.ok(res.body.redis === 'connected' || res.body.redis === 'disconnected');
    assert.ok(res.body.timestamp);
  });

  test('GET /health aliases to live probe', async () => {
    const res = await request('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });
});
