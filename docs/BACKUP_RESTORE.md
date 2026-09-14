# AlgoForge Backup, Restore & Rollback Runbook

This document details the disaster recovery, backup, restore, and release rollback procedures for the AlgoForge platform in accordance with **Phase 3 — Engineering Quality, Tests and Delivery**.

---

## 1. Backup Procedure

AlgoForge provides automated JSON and native snapshot backup utilities located in `Backend/scripts/backup.js`.

### Running an On-Demand Backup

From the `Backend/` directory, execute:
```bash
npm run backup
# or
node scripts/backup.js
```

### What Is Backed Up
- **Users**: Complete user accounts, role definitions, and hashed credentials.
- **Problems**: Curated problem catalogue, versions, starter code, signatures, and confidential testcases.
- **Submissions**: Historical submissions, immutable problem version snapshots, and evaluation results.

Backups are timestamped and stored under `Backend/backups/<ISO_TIMESTAMP>/`.

---

## 2. Restore Procedure

To restore data from a previous snapshot:

```bash
cd Backend
node scripts/restore.js <TIMESTAMP_FOLDER_NAME>
# Example:
node scripts/restore.js 2026-09-14T07-18-09-345Z
```

### Verification Steps After Restore:
1. Verify database connectivity:
   ```bash
   curl http://localhost:5000/health/ready
   ```
2. Verify problem count:
   ```bash
   curl http://localhost:5000/api/v1/problems?limit=1
   ```
3. Run the automated integration test suite to verify data consistency:
   ```bash
   npm run test:integration
   ```

---

## 3. Rollback Artifact & Strategy

### A. Application Version Rollback
1. Every release build is tagged with a git semantic version tag (e.g. `v1.2.0`).
2. If an issue is identified in staging or production:
   ```bash
   git checkout <PREVIOUS_STABLE_TAG>
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ```
3. Check health probes immediately:
   ```bash
   curl -I http://localhost:5000/health/live
   curl -I http://localhost:5000/health/ready
   ```

### B. Database Migration Rollback
Migrations are tracked in MongoDB in the `_migrations` collection.
To inspect applied migrations:
```javascript
db._migrations.find().sort({ executedAt: -1 })
```
If a migration needs to be rolled back:
1. Locate the migration file in `Backend/scripts/migrations/`.
2. Run the exported `down()` function or restore the pre-migration backup snapshot taken before the deploy.
3. Remove the migration record from `_migrations`.

---

## 4. Disaster Recovery Checklist

| Step | Action | Expected Result |
|---|---|---|
| 1 | `docker compose ps` | Check if MongoDB and Redis containers are healthy |
| 2 | `GET /health/ready` | Both `mongo` and `redis` return `"connected"` |
| 3 | `node scripts/backup.js` | Create pre-incident snapshot before any invasive intervention |
| 4 | `node scripts/restore.js <BACKUP>` | Restore from verified clean backup |
| 5 | `npm test` | Run complete test suite (unit + integration + worker + e2e) |
