/**
 * Database Backup Utility for AlgoForge
 * Exports collections to timestamped JSON backup files.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const User = require('../models/User');

async function backup() {
  await mongoose.connect(config.mongodbUri);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', timestamp);

  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`Starting AlgoForge database backup to ${backupDir}...`);

  const users = await User.find().select('+passwordHash').lean();
  fs.writeFileSync(path.join(backupDir, 'users.json'), JSON.stringify(users, null, 2));
  console.log(`Exported ${users.length} users.`);

  const problems = await Problem.find().lean();
  fs.writeFileSync(path.join(backupDir, 'problems.json'), JSON.stringify(problems, null, 2));
  console.log(`Exported ${problems.length} problems.`);

  const submissions = await Submission.find().lean();
  fs.writeFileSync(path.join(backupDir, 'submissions.json'), JSON.stringify(submissions, null, 2));
  console.log(`Exported ${submissions.length} submissions.`);

  console.log(`\nBackup completed successfully! Saved to: backups/${timestamp}\n`);
  await mongoose.disconnect();
  process.exit(0);
}

backup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
