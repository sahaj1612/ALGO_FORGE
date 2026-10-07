# Local Development

This guide covers the two supported local workflows: run the full application
with Docker Compose, or run the API, workers, and Vite development server on the
host while MongoDB and Redis run in Compose.

## Requirements

- Git
- Node.js 20 or later and npm
- Docker Desktop or Docker Engine with the Compose plugin
- A Docker-compatible sandbox executor for code run/submission workflows

## Full Compose stack

From the repository root, create the root environment file and set a strong,
unique `JWT_SECRET`:

```powershell
Copy-Item .env.example .env
```

```bash
cp .env.example .env
```

Start the services:

```bash
docker compose up -d --build
```

Initialize the database and seed the published problems:

```bash
docker compose exec api node scripts/migrate.js
docker compose exec api node scripts/seedProblems.js
```

The frontend is at `http://localhost:5173`; the API is at
`http://localhost:5000`. Check API health at `/api/v1/health/live` and
`/api/v1/health/ready`.

The Compose file starts the API, workers, MongoDB, Redis, and frontend. The run
and judge workers need a Docker-compatible executor configured through
`SANDBOX_DOCKER_HOST` for code execution. Keep the executor isolated; do not
mount the host Docker socket into a worker that also has database or Redis
credentials.

To stop the stack while preserving its named data volumes:

```bash
docker compose down
```

## Host development with Compose dependencies

Start only MongoDB and Redis from the repository root:

```bash
docker compose up -d mongodb redis
```

In PowerShell, copy the environment templates:

```powershell
Copy-Item Backend/.env.example Backend/.env
Copy-Item Frontend/.env.example Frontend/.env
```

In Bash:

```bash
cp Backend/.env.example Backend/.env
cp Frontend/.env.example Frontend/.env
```

Set a strong `JWT_SECRET` in `Backend/.env`. Install and initialize the
backend:

```bash
cd Backend
npm ci
npm run migrate
npm run seed
npm run dev
```

In separate terminals, from `Backend/`, start both workers:

```bash
node workers/runWorker.js
```

```bash
node workers/judgeWorker.js
```

In another terminal, install and start the frontend:

```bash
cd Frontend
npm ci
npm run dev
```

## Tests and quality checks

From the repository root:

```bash
npm test
npm run lint
npm run build
npm run pre-commit
```

Or run a specific backend suite from `Backend/`, for example:

```bash
npm run test:unit
npm run test:integration
npm run test:worker
npm run test:e2e
npm run test:fixtures
```

Integration and end-to-end checks need MongoDB and Redis. Language execution
fixtures also need the configured sandbox executor.

## Developer utilities

Manual helpers live under `Backend/scripts/dev/`:

- `node scripts/dev/showProblems.js` prints the current problem collection.
- `node scripts/dev/checkQueue.js` reports waiting judge jobs.
- `node scripts/dev/addJob.js` enqueues a demo job on the test queue.

These are for local debugging, not production operations. The prototype seed in
`Backend/scripts/legacy/` is destructive and should not be used for normal
development; use `npm run seed` instead.

For backup and recovery steps, see [BACKUP_RESTORE.md](BACKUP_RESTORE.md). For
service incident procedures, see [RUNBOOKS.md](RUNBOOKS.md).
