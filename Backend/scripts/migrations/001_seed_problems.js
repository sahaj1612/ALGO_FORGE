/**
 * Migration 001: Seed Curated Problem Catalog
 */

const Problem = require('../../models/Problem');

async function up() {
  console.log('Running Migration 001: Seeding Problem Catalog...');
  // Check if problems already exist
  const count = await Problem.countDocuments();
  if (count > 0) {
    console.log(`Problems collection already contains ${count} items. Skipping initial insert.`);
    return;
  }

  const { seedProblems } = require('../seedProblems');
  if (typeof seedProblems === 'function') {
    await seedProblems();
  }
}

async function down() {
  console.log('Rolling back Migration 001...');
  // Optional rollback
}

module.exports = { up, down };
