/**
 * Database Backup Utility for AlgoForge
 * Exports collections to timestamped, optionally AES-256-GCM encrypted backup files.
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

function encryptData(dataString, secretKey) {
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(secretKey, salt, 32);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(dataString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return JSON.stringify({
    cipher: 'aes-256-gcm',
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    authTag,
    encrypted
  }, null, 2);
}

async function backup() {
  await mongoose.connect(config.mongodbUri);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', timestamp);

  fs.mkdirSync(backupDir, { recursive: true });

  const shouldEncrypt = Boolean(config.backupEncryptionKey);
  console.log(`Starting AlgoForge database backup to ${backupDir} [Encrypted: ${shouldEncrypt}]...`);

  function saveCollection(name, data) {
    const rawJson = JSON.stringify(data, null, 2);
    if (shouldEncrypt) {
      const encrypted = encryptData(rawJson, config.backupEncryptionKey);
      fs.writeFileSync(path.join(backupDir, `${name}.enc`), encrypted, 'utf8');
    } else {
      fs.writeFileSync(path.join(backupDir, `${name}.json`), rawJson, 'utf8');
    }
  }

  const users = await User.find().select('+passwordHash').lean();
  saveCollection('users', users);
  console.log(`Exported ${users.length} users.`);

  const problems = await Problem.find().lean();
  saveCollection('problems', problems);
  console.log(`Exported ${problems.length} problems.`);

  const submissions = await Submission.find().lean();
  saveCollection('submissions', submissions);
  console.log(`Exported ${submissions.length} submissions.`);

  console.log(`\nBackup completed successfully! Saved to: backups/${timestamp}\n`);
  await mongoose.disconnect();
  process.exit(0);
}

backup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
