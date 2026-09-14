/**
 * Deterministic Regression Fixtures for Published Problems & Languages
 */

const FIXTURES = [
  {
    language: 'javascript',
    code: 'function solve(nums) { return Math.max(...nums); }',
    input: [3, 11, 2],
    expected: '11'
  },
  {
    language: 'python',
    code: 'class Solution:\n    def solve(self, nums):\n        return max(nums)',
    input: [3, 11, 2],
    expected: '11'
  },
  {
    language: 'java',
    code: 'class Solution {\n    public int solve(int[] nums) {\n        return 11;\n    }\n}',
    input: [3, 11, 2],
    expected: '11'
  },
  {
    language: 'cpp',
    code: '#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        return 11;\n    }\n};',
    input: [3, 11, 2],
    expected: '11'
  },
  {
    language: 'c',
    code: 'int solve(int* nums, int numsSize) { return 11; }',
    input: [3, 11, 2],
    expected: '11'
  }
];

module.exports = {
  FIXTURES
};
