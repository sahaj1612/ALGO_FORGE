/**
 * Migration 002: Ensure Database Indexes
 */

const Problem = require('../../models/Problem');
const Submission = require('../../models/Submission');
const User = require('../../models/User');

async function up() {
  console.log('Running Migration 002: Ensuring compound indexes...');
  
  // Problem indexes
  await Problem.collection.createIndex({ slug: 1 }, { unique: true });
  await Problem.collection.createIndex({ status: 1, difficulty: 1, topic: 1 });

  // Submission indexes
  await Submission.collection.createIndex({ userId: 1, createdAt: -1 });
  await Submission.collection.createIndex({ problemId: 1, createdAt: -1 });
  await Submission.collection.createIndex({ status: 1, createdAt: 1 });

  // User indexes (sparse unique googleId)
  await User.collection.createIndex({ email: 1 }, { unique: true });
  try {
    await User.collection.dropIndex('googleId_1');
  } catch {}
  await User.collection.createIndex({ googleId: 1 }, { unique: true, sparse: true });

  console.log('Migration 002: All indexes ensured successfully.');
}

async function down() {
  console.log('Rolling back Migration 002...');
}

module.exports = { up, down };
