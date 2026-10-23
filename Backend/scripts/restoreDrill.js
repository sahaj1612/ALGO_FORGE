/**
 * Disaster Recovery & Restore Drill Automated Verification Script
 * Validates encrypted backup creation, decryption, integrity checking, and recovery according to Phase 5.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/env');

const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const User = require('../models/User');

function decryptData(encryptedJsonString, secretKey) {
  const meta = JSON.parse(encryptedJsonString);
  const iv = Buffer.from(meta.iv, 'hex');
  const salt = Buffer.from(meta.salt, 'hex');
  const authTag = Buffer.from(meta.authTag, 'hex');
  const key = crypto.scryptSync(secretKey, salt, 32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(meta.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}

function encryptData(rawString, secretKey) {
  const iv = crypto.randomBytes(12);
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(secretKey, salt, 32);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(rawString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    authTag: authTag.toString('hex'),
    encrypted
  }, null, 2);
}

async function runRestoreDrill() {
  const drillStart = Date.now();
  console.log('=============================================================');
  console.log('ALGOFORGE DISASTER RECOVERY & RESTORE DRILL');
  console.log('=============================================================\n');

  await mongoose.connect(config.mongodbUri);

  // 1. Snapshot active records from database
  console.log('[1/5] Taking live snapshot of database collections...');
  const users = await User.find().select('+passwordHash').lean();
  const problems = await Problem.find().lean();
  const submissions = await Submission.find().lean();

  console.log(` - Captured ${users.length} user(s)`);
  console.log(` - Captured ${problems.length} problem(s)`);
  console.log(` - Captured ${submissions.length} submission(s)`);

  // 2. Encrypt snapshot with AES-256-GCM
  console.log('\n[2/5] Encrypting snapshot with AES-256-GCM backup key...');
  const drillDir = path.join(__dirname, '..', 'backups', `drill-${Date.now()}`);
  fs.mkdirSync(drillDir, { recursive: true });

  const encKey = config.backupEncryptionKey;
  fs.writeFileSync(path.join(drillDir, 'users.enc'), encryptData(JSON.stringify(users), encKey), 'utf8');
  fs.writeFileSync(path.join(drillDir, 'problems.enc'), encryptData(JSON.stringify(problems), encKey), 'utf8');
  fs.writeFileSync(path.join(drillDir, 'submissions.enc'), encryptData(JSON.stringify(submissions), encKey), 'utf8');
  console.log(` - Encrypted backup written to ${drillDir}`);

  // 3. Decrypt and verify payload checksums
  console.log('\n[3/5] Decrypting and validating cryptographic authentication tags...');
  const decryptedUsers = decryptData(fs.readFileSync(path.join(drillDir, 'users.enc'), 'utf8'), encKey);
  const decryptedProblems = decryptData(fs.readFileSync(path.join(drillDir, 'problems.enc'), 'utf8'), encKey);
  const decryptedSubmissions = decryptData(fs.readFileSync(path.join(drillDir, 'submissions.enc'), 'utf8'), encKey);

  if (decryptedUsers.length !== users.length) throw new Error('User count mismatch after decryption');
  if (decryptedProblems.length !== problems.length) throw new Error('Problem count mismatch after decryption');
  if (decryptedSubmissions.length !== submissions.length) throw new Error('Submission count mismatch after decryption');
  console.log(' - AES-256-GCM authentication tags and counts verified.');

  // 4. Test recovery verification
  console.log('\n[4/5] Testing schema compliance & integrity checks on restored data...');
  for (const p of decryptedProblems) {
    if (!p.slug || !p.title || !p.difficulty) {
      throw new Error(`Problem ${p._id} failed schema integrity check`);
    }
  }
  for (const u of decryptedUsers) {
    if (!u.email) {
      throw new Error(`User ${u._id} failed schema integrity check`);
    }
  }
  console.log(' - Schema and integrity checks passed.');

  // 5. Clean up temporary drill directory
  console.log('\n[5/5] Cleaning up temporary drill artifacts...');
  fs.rmSync(drillDir, { recursive: true, force: true });
  console.log(' - Temporary drill artifacts removed.');

  const durationSec = ((Date.now() - drillStart) / 1000).toFixed(2);
  console.log('\n=============================================================');
  console.log(`RESTORE DRILL RESULT: SUCCESS (Completed in ${durationSec}s)`);
  console.log('=============================================================\n');

  if (require.main === module) {
    await mongoose.disconnect();
    process.exit(0);
  }

  await mongoose.disconnect();
  return { status: 'SUCCESS', durationSec };
}

if (require.main === module) {
  runRestoreDrill().catch(err => {
    console.error('\nRestore drill failed:', err.message);
    process.exit(1);
  });
}

module.exports = { runRestoreDrill };
