/**
 * Database Restore Utility for AlgoForge
 * Restores collections from a specified backup folder.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const User = require('../models/User');

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

  const usersFile = path.join(backupDir, 'users.json');
  if (fs.existsSync(usersFile)) {
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    for (const u of users) {
      await User.findByIdAndUpdate(u._id, u, { upsert: true });
    }
    console.log(`Restored ${users.length} users.`);
  }

  const problemsFile = path.join(backupDir, 'problems.json');
  if (fs.existsSync(problemsFile)) {
    const problems = JSON.parse(fs.readFileSync(problemsFile, 'utf8'));
    for (const p of problems) {
      await Problem.findByIdAndUpdate(p._id, p, { upsert: true });
    }
    console.log(`Restored ${problems.length} problems.`);
  }

  const submissionsFile = path.join(backupDir, 'submissions.json');
  if (fs.existsSync(submissionsFile)) {
    const submissions = JSON.parse(fs.readFileSync(submissionsFile, 'utf8'));
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
