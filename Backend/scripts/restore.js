/**
 * Database Restore Utility for AlgoForge
 * Restores collections from a specified backup folder (supports plain JSON or AES-256-GCM encrypted backups).
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

function loadCollection(backupDir, name) {
  const encPath = path.join(backupDir, `${name}.enc`);
  if (fs.existsSync(encPath)) {
    console.log(`Decrypting ${name}.enc...`);
    return decryptData(fs.readFileSync(encPath, 'utf8'), config.backupEncryptionKey);
  }

  const jsonPath = path.join(backupDir, `${name}.json`);
  if (fs.existsSync(jsonPath)) {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }

  return null;
}

async function restore() {
  const targetFolder = process.argv[2];
  if (!targetFolder) {
    console.error('Usage: node scripts/restore.js <timestamp_folder_name_or_path>');
    process.exit(1);
  }

  const backupDir = path.isAbsolute(targetFolder)
    ? targetFolder
    : path.join(__dirname, '..', 'backups', targetFolder);

  if (!fs.existsSync(backupDir)) {
    console.error(`Backup folder not found: ${backupDir}`);
    process.exit(1);
  }

  await mongoose.connect(config.mongodbUri);
  console.log(`Restoring AlgoForge database from ${backupDir}...`);

  const users = loadCollection(backupDir, 'users');
  if (users) {
    for (const u of users) {
      await User.findByIdAndUpdate(u._id, u, { upsert: true });
    }
    console.log(`Restored ${users.length} users.`);
  }

  const problems = loadCollection(backupDir, 'problems');
  if (problems) {
    for (const p of problems) {
      await Problem.findByIdAndUpdate(p._id, p, { upsert: true });
    }
    console.log(`Restored ${problems.length} problems.`);
  }

  const submissions = loadCollection(backupDir, 'submissions');
  if (submissions) {
    for (const s of submissions) {
      await Submission.findByIdAndUpdate(s._id, s, { upsert: true });
    }
    console.log(`Restored ${submissions.length} submissions.`);
  }

  console.log('\nDatabase restore completed successfully!\n');
  await mongoose.disconnect();
  process.exit(0);
}

restore().catch(err => {
  console.error('Restore failed:', err);
  process.exit(1);
});
