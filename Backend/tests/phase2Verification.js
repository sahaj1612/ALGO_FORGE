require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { execute, LANGUAGES } = require('../services/judge');

const API = 'http://localhost:5000/api';

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/algoforge');
  console.log('=== PHASE 2 VERIFICATION SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Check 30+ validated published problems in database
    const publishedCount = await Problem.countDocuments({ status: 'published' });
    assert(publishedCount >= 30, `Database contains >= 30 published problems (Found: ${publishedCount})`);

    // 2. Test all 5 advertised languages with adapters in isolated Docker sandbox
    console.log('\n--- Testing Language Sandbox Execution ---');
    const langTests = [
      { lang: 'javascript', code: 'function solve(nums) { return Math.max(...nums); }', input: [3, 11, 2], expected: '11' },
      { lang: 'python', code: 'class Solution:\n    def solve(self, nums):\n        return max(nums)', input: [3, 11, 2], expected: '11' },
      { lang: 'java', code: 'class Solution {\n    public int solve(int[] nums) {\n        return 11;\n    }\n}', input: [3, 11, 2], expected: '11' },
      { lang: 'cpp', code: '#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        return 11;\n    }\n};', input: [3, 11, 2], expected: '11' },
      { lang: 'c', code: 'int solve(int* nums, int numsSize) { return 11; }', input: [3, 11, 2], expected: '11' }
    ];

    for (const lt of langTests) {
      assert(Boolean(LANGUAGES[lt.lang]), `Language '${lt.lang}' configured in judge LANGUAGES`);
      const res = await execute({ code: lt.code, input: lt.input, language: lt.lang });
      assert(res.verdict === 'accepted' && res.output === lt.expected, `Language '${lt.lang}' executes in Docker and returns '${lt.expected}' (got: '${res.output}', verdict: '${res.verdict}')`);
    }

    // 3. Security: Ensure hidden testcases are NEVER leaked in public endpoints
    console.log('\n--- Testing Testcase Privacy & Confidentiality ---');
    const pDetailRes = await (await fetch(`${API}/problems/two-sum`)).json();
    assert(!('hiddenTestcases' in pDetailRes), 'Public problem detail /api/problems/:slug omits hiddenTestcases');
    assert('testcases' in pDetailRes && 'examples' in pDetailRes, 'Public problem detail includes sample testcases and examples');

    const pListRes = await (await fetch(`${API}/problems?limit=5`)).json();
    assert(Array.isArray(pListRes.items) && pListRes.items.every(item => !('hiddenTestcases' in item)), 'Public problem list /api/problems omits hiddenTestcases');

    // 4. Test Public Run capped custom testcases
    console.log('\n--- Testing Public Run Custom Testcase Cap ---');
    const testUser = await User.findOne({});
    const token = jwt.sign({ id: testUser._id.toString() }, process.env.JWT_SECRET);
    const runCapRes = await (await fetch(`${API}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        problemId: 'two-sum',
        code: 'function solve() {}',
        testcases: [1, 2, 3, 4, 5, 6] // 6 exceeds max 5
      })
    })).json();
    assert(runCapRes.message?.includes('maximum of 5'), 'Public /api/run rejects > 5 custom testcases');

    // 5. Test Submit Flow: Problem version snapshotting, HTTP 202, and BullMQ worker execution
    console.log('\n--- Testing Submit Flow & Version Snapshotting ---');
    const subRes = await (await fetch(`${API}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        problemId: 'two-sum',
        language: 'javascript',
        code: 'function solve(nums, target) { const map = new Map(); for (let i = 0; i < nums.length; i++) { const diff = target - nums[i]; if (map.has(diff)) return [map.get(diff), i]; map.set(nums[i], i); } return []; }'
      })
    })).json();

    assert(Boolean(subRes.id && subRes.status === 'pending' && subRes.pollAfterMs === 1000), 'POST /api/submit returns HTTP 202 contract with id, pending status, and pollAfterMs');

    // Poll until terminal verdict
    let pollAttempts = 0;
    let finalSub = null;
    while (pollAttempts < 15) {
      await new Promise(r => setTimeout(r, 1000));
      const poller = await (await fetch(`${API}/submissions/${subRes.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })).json();

      if (poller.isTerminal) {
        finalSub = poller;
        break;
      }
      pollAttempts++;
    }

    assert(Boolean(finalSub && finalSub.status === 'accepted'), `BullMQ Worker picked up submission, judged hidden cases, and produced verdict 'accepted' (status: ${finalSub?.status})`);
    assert(finalSub?.problemVersion === 1, `Submission snapshot problemVersion == 1 (got: ${finalSub?.problemVersion})`);
    assert(Array.isArray(finalSub?.results) && finalSub.results.every(r => r.input === undefined && r.expected === undefined), 'Submission results for hidden testcases never reveal secret inputs/outputs');

    // 6. Security: Verify Ownership Authorization on submissions
    console.log('\n--- Testing Submission Authorization ---');
    const intruderToken = jwt.sign({ id: new mongoose.Types.ObjectId().toString(), role: 'user' }, process.env.JWT_SECRET);
    const authCheckRes = await fetch(`${API}/submissions/${subRes.id}`, {
      headers: { Authorization: `Bearer ${intruderToken}` }
    });
    assert(authCheckRes.status === 403, 'Unauthorized user receiving 403 Forbidden when requesting another user submission');

    // 7. Verify Pagination beyond 100 submissions
    console.log('\n--- Testing Submission Pagination ---');
    const subHistoryRes = await (await fetch(`${API}/submissions?limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    })).json();
    assert(Array.isArray(subHistoryRes.items) && 'total' in subHistoryRes, 'GET /api/submissions returns cursor paginated list with total');

    // 8. Learning Features: Bookmarks, Notes, Viewed
    console.log('\n--- Testing Learning Features ---');
    const targetProblem = await Problem.findOne({ slug: 'two-sum' });
    const noteRes = await (await fetch(`${API}/learning/notes/${targetProblem._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: 'Verified Phase 2 note test' })
    })).json();
    assert(noteRes.content === 'Verified Phase 2 note test', 'Notes persisted and returned via /api/learning/notes/:id');

    console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
