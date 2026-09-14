/**
 * Unified Test Runner for AlgoForge
 * Runs test suites in isolated child processes to ensure 100% deterministic execution and clean lifecycle teardown.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testPattern = process.argv[2] || 'all';

function getFiles(dir, matchStr = '.test.js') {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...getFiles(full, matchStr));
    } else if (entry.isFile() && entry.name.endsWith(matchStr)) {
      result.push(full);
    }
  }
  return result;
}

const testsDir = __dirname;
let files = [];

if (testPattern === 'unit') {
  files = getFiles(path.join(testsDir, 'unit'));
} else if (testPattern === 'integration') {
  files = getFiles(path.join(testsDir, 'integration'));
} else if (testPattern === 'worker') {
  files = getFiles(path.join(testsDir, 'worker'));
} else if (testPattern === 'e2e') {
  files = getFiles(path.join(testsDir, 'e2e'));
} else if (testPattern === 'fixtures') {
  files = getFiles(path.join(testsDir, 'fixtures'));
} else {
  files = [
    ...getFiles(path.join(testsDir, 'unit')),
    ...getFiles(path.join(testsDir, 'integration')),
    ...getFiles(path.join(testsDir, 'worker')),
    ...getFiles(path.join(testsDir, 'e2e')),
    ...getFiles(path.join(testsDir, 'fixtures'))
  ];
}

console.log(`\n=============================================================`);
console.log(`ALGOFORGE TEST RUNNER: Running ${files.length} test suite(s) [${testPattern.toUpperCase()}]`);
console.log(`=============================================================\n`);

let passedCount = 0;
let failedCount = 0;
const failures = [];

const startTime = Date.now();

for (const file of files) {
  const relPath = path.relative(testsDir, file);
  console.log(`\n[RUNNING] ${relPath}...`);
  
  const result = spawnSync(process.execPath, ['--test', file], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
    timeout: 30000
  });

  if (result.status === 0) {
    passedCount++;
    console.log(`[PASS] ${relPath}`);
  } else {
    failedCount++;
    failures.push(relPath);
    console.error(`[FAIL] ${relPath} (exit code: ${result.status})`);
  }
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

console.log(`\n=============================================================`);
console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED in ${totalTime}s`);
console.log(`=============================================================`);

if (failures.length > 0) {
  console.error('\nFailed suites:');
  failures.forEach(f => console.error(` - ${f}`));
  process.exit(1);
} else {
  console.log('\nAll suites passed successfully!\n');
  process.exit(0);
}
