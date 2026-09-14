#!/usr/bin/env node

/**
 * Pre-commit validation hook for AlgoForge
 * Runs unit tests and lint checks before commits are finalized.
 */

const { spawnSync } = require('child_process');
const path = require('path');

console.log('Running pre-commit quality gate checks...');

const root = path.join(__dirname, '..');

// 1. Backend Unit Tests
console.log('\n[1/3] Running Backend unit tests...');
const backendTests = spawnSync(process.execPath, ['tests/runAllTests.js', 'unit'], {
  cwd: path.join(root, 'Backend'),
  stdio: 'inherit'
});
if (backendTests.status !== 0) {
  console.error('\nPre-commit gate failed: Backend unit tests did not pass.\n');
  process.exit(1);
}

// 2. Frontend Lint
console.log('\n[2/3] Running Frontend lint...');
const frontendLint = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'lint'], {
  cwd: path.join(root, 'Frontend'),
  stdio: 'inherit',
  shell: true
});
if (frontendLint.status !== 0) {
  console.error('\nPre-commit gate failed: Frontend linting did not pass.\n');
  process.exit(1);
}

// 3. Frontend Build Check
console.log('\n[3/3] Running Frontend build check...');
const frontendBuild = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  cwd: path.join(root, 'Frontend'),
  stdio: 'inherit',
  shell: true
});
if (frontendBuild.status !== 0) {
  console.error('\nPre-commit gate failed: Frontend build did not pass.\n');
  process.exit(1);
}

console.log('\nAll pre-commit checks passed successfully! Ready to commit.\n');
process.exit(0);
