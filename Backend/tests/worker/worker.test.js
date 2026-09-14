process.env.NODE_ENV = 'test';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Problem = require('../../models/Problem');
const Submission = require('../../models/Submission');
const { processSubmissionJob } = require('../../workers/judgeWorker');
const config = require('../../config/env');

describe('Worker: Judge Job Processing Suite', () => {
  let testUser = null;
  let sampleProblem = null;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongodbUri);
    }

    testUser = await User.create({
      name: 'Worker Tester',
      email: `worker_tester_${Date.now()}@algoforge.test`,
      passwordHash: 'dummy:hash'
    });

    sampleProblem = await Problem.findOne({ slug: 'find-maximum-element' });
    if (!sampleProblem) {
      sampleProblem = await Problem.create({
        slug: `test-problem-${Date.now()}`,
        title: 'Test Worker Problem',
        difficulty: 'Easy',
        topic: 'Arrays',
        description: 'Find max element',
        hiddenTestcases: [
          { input: [1, 5, 3], output: '5' },
          { input: [10, 2, 4], output: '10' }
        ],
        version: 1
      });
    }
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test('judges accepted submission and persists metrics and version', async () => {
    const sub = await Submission.create({
      userId: testUser._id,
      problemId: sampleProblem._id,
      code: 'function solve(nums) { return Math.max(...nums); }',
      language: 'javascript',
      status: 'pending'
    });

    const judged = await processSubmissionJob({ submissionId: sub._id, jobId: 'job-101' });

    assert.ok(judged);
    assert.equal(judged.status, 'accepted');
    assert.equal(judged.problemVersion, sampleProblem.version || 1);
    assert.ok(Array.isArray(judged.results));
    assert.ok(judged.results.length > 0);
    // Crucial security requirement: hidden testcase results never leak input or expected output
    for (const r of judged.results) {
      assert.equal(r.input, undefined);
      assert.equal(r.expected, undefined);
      assert.equal(r.status, 'passed');
    }
  });

  test('judges wrong answer and stops at first failing testcase', async () => {
    const sub = await Submission.create({
      userId: testUser._id,
      problemId: sampleProblem._id,
      code: 'function solve(nums) { return -999; }',
      language: 'javascript',
      status: 'pending'
    });

    const judged = await processSubmissionJob({ submissionId: sub._id, jobId: 'job-102' });

    assert.ok(judged);
    assert.equal(judged.status, 'wrong_answer');
    assert.equal(judged.results[0].status, 'wrong_answer');
  });

  test('handles missing problem gracefully with server_error', async () => {
    const fakeProblemId = new mongoose.Types.ObjectId();
    const sub = await Submission.create({
      userId: testUser._id,
      problemId: fakeProblemId,
      code: 'function solve() {}',
      language: 'javascript',
      status: 'pending'
    });

    const judged = await processSubmissionJob({ submissionId: sub._id, jobId: 'job-103' });

    assert.ok(judged);
    assert.equal(judged.status, 'server_error');
    assert.equal(judged.error, 'Problem no longer exists.');
  });

  test('handles missing submission safely without throwing', async () => {
    const nonExistentSubId = new mongoose.Types.ObjectId();
    const result = await processSubmissionJob({ submissionId: nonExistentSubId, jobId: 'job-104' });
    assert.equal(result, null);
  });
});
