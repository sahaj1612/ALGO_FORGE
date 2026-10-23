const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  recordHttpRequest,
  recordVerdict,
  recordDeadLetter,
  getMetricsSnapshot,
  getPrometheusMetrics,
  resetMetrics,
  computePercentile
} = require('../../services/metricsService');
const { reconcileStalledSubmissions } = require('../../services/reconciliationService');
const User = require('../../models/User');
const Problem = require('../../models/Problem');
const Submission = require('../../models/Submission');
const config = require('../../config/env');

describe('Unit: Phase 5 Observability & Platform Scale', () => {

  describe('Metrics Service Calculations', () => {
    beforeEach(() => {
      resetMetrics();
    });

    test('computes accurate latency percentiles (p50, p95, p99)', () => {
      // 100 samples from 1ms to 100ms
      for (let i = 1; i <= 100; i++) {
        recordHttpRequest({ method: 'POST', path: '/api/v1/submit', statusCode: 202, durationMs: i });
      }

      const p50 = computePercentile(Array.from({ length: 100 }, (_, i) => i + 1), 50);
      const p95 = computePercentile(Array.from({ length: 100 }, (_, i) => i + 1), 95);
      const p99 = computePercentile(Array.from({ length: 100 }, (_, i) => i + 1), 99);

      assert.equal(p50, 51);
      assert.equal(p95, 96);
      assert.equal(p99, 100);
    });

    test('tracks status code breakdown (2xx, 4xx, 5xx)', async () => {
      recordHttpRequest({ method: 'GET', path: '/health', statusCode: 200, durationMs: 10 });
      recordHttpRequest({ method: 'POST', path: '/api/v1/submit', statusCode: 202, durationMs: 25 });
      recordHttpRequest({ method: 'POST', path: '/api/v1/submit', statusCode: 400, durationMs: 5 });
      recordHttpRequest({ method: 'GET', path: '/unknown', statusCode: 404, durationMs: 2 });
      recordHttpRequest({ method: 'GET', path: '/api/v1/error', statusCode: 500, durationMs: 15 });

      const snapshot = await getMetricsSnapshot();

      assert.equal(snapshot.http.totalRequests, 5);
      assert.equal(snapshot.http.statusCounts['2xx'], 2);
      assert.equal(snapshot.http.statusCounts['4xx'], 2);
      assert.equal(snapshot.http.statusCounts['5xx'], 1);
    });

    test('formats Prometheus exposition text according to specification', async () => {
      recordHttpRequest({ method: 'POST', path: '/api/v1/run', statusCode: 200, durationMs: 35 });
      recordVerdict('accepted');
      recordVerdict('wrong_answer');
      recordDeadLetter();

      const promText = await getPrometheusMetrics();

      assert.ok(promText.includes('algoforge_uptime_seconds'));
      assert.ok(promText.includes('algoforge_http_requests_total{status_class="2xx"} 1'));
      assert.ok(promText.includes('algoforge_queue_depth{queue="judge-queue",state="waiting"}'));
      assert.ok(promText.includes('algoforge_queue_depth{queue="run-queue",state="waiting"}'));
      assert.ok(promText.includes('algoforge_submissions_total{verdict="accepted"} 1'));
      assert.ok(promText.includes('algoforge_submissions_total{verdict="wrong_answer"} 1'));
      assert.ok(promText.includes('algoforge_dead_letters_total'));
    });
  });

  describe('Reconciliation & Fault Tolerance Logic', () => {
    let testUser = null;
    let testProblem = null;

    beforeEach(async () => {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(config.mongodbUri);
      }
      testUser = await User.create({
        name: 'Recon Test User',
        email: `recon_${Date.now()}@algoforge.test`,
        passwordHash: 'dummy:hash'
      });
      testProblem = await Problem.create({
        slug: `recon-prob-${Date.now()}`,
        title: 'Recon Problem',
        difficulty: 'Easy',
        status: 'published'
      });
    });

    afterEach(async () => {
      if (testUser) await User.findByIdAndDelete(testUser._id);
      if (testProblem) await Problem.findByIdAndDelete(testProblem._id);
      await Submission.deleteMany({ userId: testUser?._id });
    });

    test('reconciles orphaned running submission past timeout to server_error when retries exhausted', async () => {
      const stalled = await Submission.create({
        userId: testUser._id,
        problemId: testProblem._id,
        code: 'function solve() {}',
        status: 'running',
        reconciliationRetries: 2, // Retries exhausted
        heartbeatAt: new Date(Date.now() - 100000)
      });

      const report = await reconcileStalledSubmissions({ stallThresholdMs: 1000, maxRetries: 2 });

      assert.ok(report.checkedCount >= 1);
      assert.equal(report.reconciledToErrorCount, 1);

      const refreshed = await Submission.findById(stalled._id);
      assert.equal(refreshed.status, 'server_error');
      assert.ok(refreshed.error.includes('reconciliation retries'));
    });

    test('ignores active non-stalled submissions within threshold window', async () => {
      await Submission.create({
        userId: testUser._id,
        problemId: testProblem._id,
        code: 'function solve() {}',
        status: 'running',
        heartbeatAt: new Date() // Fresh heartbeat
      });

      const report = await reconcileStalledSubmissions({ stallThresholdMs: 60000 });
      assert.equal(report.reconciledToErrorCount, 0);
    });
  });
});
