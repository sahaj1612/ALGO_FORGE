const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { wrapper, LANGUAGES } = require('../../services/judge');

describe('Unit: Language Sandbox Adapters', () => {
  const sampleArrayInput = [2, 7, 11, 15];
  const sampleCycleInput = { nums: [3, 2, 0, -4], pos: 1 };
  const sampleGraphInput = { n: 4, edges: [[0, 1, 1], [1, 2, 2]] };

  test('all 5 supported languages are configured', () => {
    const required = ['javascript', 'python', 'java', 'cpp', 'c'];
    for (const lang of required) {
      assert.ok(LANGUAGES[lang], `Language ${lang} should be defined in LANGUAGES`);
      assert.ok(LANGUAGES[lang].image, `Language ${lang} has container image`);
      assert.ok(LANGUAGES[lang].compileAndRun, `Language ${lang} has compileAndRun command`);
    }
  });

  test('JavaScript adapter generates valid execution wrapper for arrays', () => {
    const userCode = 'function solve(nums) { return Math.max(...nums); }';
    const wrapped = wrapper(userCode, sampleArrayInput, 'javascript');
    assert.ok(wrapped.includes(userCode), 'Wrapped code contains original solution');
    assert.ok(wrapped.includes('__run_solution()'), 'Wrapped code contains harness runner');
    assert.ok(wrapped.includes('console.log'), 'Wrapped code prints result');
  });

  test('JavaScript adapter handles ListNode linked list cycle structure', () => {
    const userCode = 'function solve(head) { return true; }';
    const wrapped = wrapper(userCode, sampleCycleInput, 'javascript');
    assert.ok(wrapped.includes('ListNode'), 'Generates ListNode constructor');
    assert.ok(wrapped.includes('nodes[nodes.length - 1].next = nodes[input_data.pos]'), 'Links cycle at pos');
  });

  test('Python adapter generates class and execution wrapper', () => {
    const userCode = 'class Solution:\n    def solve(self, nums):\n        return max(nums)';
    const wrapped = wrapper(userCode, sampleArrayInput, 'python');
    assert.ok(wrapped.includes('Solution()'), 'Instantiates Solution class');
    assert.ok(wrapped.includes('print('), 'Prints output');
  });

  test('Java adapter wraps code with Runner harness and imports', () => {
    const userCode = 'class Solution { public int solve(int[] nums) { return 42; } }';
    const wrapped = wrapper(userCode, sampleArrayInput, 'java');
    assert.ok(wrapped.includes('class Solution'), 'Contains Solution class');
    assert.ok(wrapped.includes('import java.util.*;'), 'Includes standard library imports');
    assert.ok(wrapped.includes('public static void main'), 'Provides main entry point');
  });

  test('C++ adapter includes STL headers and executes solution', () => {
    const userCode = '#include <vector>\nusing namespace std;\nclass Solution { public: int solve(vector<int>& nums) { return 42; } };';
    const wrapped = wrapper(userCode, sampleArrayInput, 'cpp');
    assert.ok(wrapped.includes('#include <iostream>'), 'Includes iostream');
    assert.ok(wrapped.includes('int main()'), 'Provides main entry point');
  });

  test('C adapter handles arrays and pointer arguments', () => {
    const userCode = 'int solve(int* nums, int numsSize) { return 42; }';
    const wrapped = wrapper(userCode, sampleArrayInput, 'c');
    assert.ok(wrapped.includes('int main()'), 'Provides main entry point');
  });

  test('adapter handles malformed input gracefully without crashing', () => {
    const malformed = '{{{not valid json';
    assert.doesNotThrow(() => {
      const wrapped = wrapper('function solve() {}', malformed, 'javascript');
      assert.ok(typeof wrapped === 'string');
    });
  });
});
