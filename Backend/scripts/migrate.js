/**
 * Versioned Database Migration Runner for AlgoForge
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const migrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  executedAt: { type: Date, default: Date.now }
});

const Migration = mongoose.model('_Migration', migrationSchema);

async function runMigrations() {
  await mongoose.connect(config.mongodbUri);
  console.log('Connected to MongoDB for migrations.');

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    process.exit(0);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  console.log(`Found ${files.length} migration file(s).`);

  for (const file of files) {
    const alreadyRun = await Migration.findOne({ name: file });
    if (alreadyRun) {
      console.log(`[SKIP] ${file} (already executed on ${alreadyRun.executedAt.toISOString()})`);
      continue;
    }

    console.log(`[APPLYING] ${file}...`);
    const migration = require(path.join(migrationsDir, file));
    if (typeof migration.up === 'function') {
      await migration.up();
      await Migration.create({ name: file });
      console.log(`[APPLIED] ${file}`);
    }
  }

  console.log('\nAll pending migrations completed successfully.');
  await mongoose.disconnect();
  process.exit(0);
}

runMigrations().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
