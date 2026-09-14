const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request } = require('./setup');

describe('Integration: Problems API', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  test('GET /api/v1/problems returns paginated published problem list without hiddenTestcases', async () => {
    const res = await request('/api/v1/problems?limit=5');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items), 'items is an array');
    assert.ok(res.body.total > 0, 'total is greater than 0');

    // Never leak hidden testcases in list
    for (const item of res.body.items) {
      assert.equal(item.hiddenTestcases, undefined, 'Hidden testcases must not be present in problem list');
      assert.ok(item.slug);
      assert.ok(item.title);
      assert.ok(item.difficulty);
    }
  });

  test('GET /api/v1/problems/:slug returns public problem detail omitting hiddenTestcases', async () => {
    const res = await request('/api/v1/problems/two-sum');
    assert.equal(res.status, 200);
    assert.equal(res.body.slug, 'two-sum');
    assert.equal(res.body.hiddenTestcases, undefined, 'Public detail must omit hiddenTestcases');
    assert.ok(Array.isArray(res.body.testcases), 'Includes public sample testcases');
    assert.ok(Array.isArray(res.body.examples), 'Includes public examples');
  });

  test('GET /api/v1/problems/:slug returns 404 for unknown slug', async () => {
    const res = await request('/api/v1/problems/unknown-nonexistent-problem-slug');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  test('GET /api/problems backward-compatible alias returns identical contract', async () => {
    const res = await request('/api/problems?limit=2');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items));
  });
});
