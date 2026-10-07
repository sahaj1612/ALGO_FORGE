# AlgoForge

> A full-stack algorithm practice platform with asynchronous judging, multi-language code execution, and engineering quality checks.

![AlgoForge homepage](docs/algoforge-home.png)

AlgoForge combines a React/Vite interface, an Express API, MongoDB persistence, and BullMQ/Redis workers. Code execution uses a separately configured Docker-compatible sandbox executor.

---

## Table of Contents

- [Architecture & Design](#architecture--design)
- [Quick Start](#quick-start)
  - [Option A: One-Command Docker Compose (Recommended)](#option-a-one-command-docker-compose-recommended)
  - [Option B: Local Development](#option-b-local-development)
- [Environment Configuration](#environment-configuration)
- [Testing Matrix & Verification](#testing-matrix--verification)
- [Database Migrations & Seed Data](#database-migrations--seed-data)
- [Backup and Disaster Recovery](#backup-and-disaster-recovery)
- [API Documentation & Contracts](#api-documentation--contracts)
- [CI/CD Pipeline & Quality Gates](#cicd-pipeline--quality-gates)
- [Security Architecture & Multi-Tenant Boundaries](#security-architecture--multi-tenant-boundaries)
- [Supported Execution Environments](#supported-execution-environments)
- [Project Structure & Contributor Guides](#project-structure--contributor-guides)

---

## Architecture & Design

AlgoForge follows a strict **layered enterprise architecture** to ensure testability, security, and separation of concerns:

```
                  ┌────────────────────────────────────────────────┐
                  │          React 19 + Vite Frontend SPA          │
                  │  (Monaco Editor, TailwindCSS, Framer Motion)   │
                  └───────────────────────┬────────────────────────┘
                                          │ HTTP / JSON API
                                          ▼
                  ┌────────────────────────────────────────────────┐
                  │           Express API Server (Port 5000)       │
                  │  Routes -> Controllers -> Services -> DA/Models│
                  │  - Sensitive field redaction logger            │
                  │  - Typed AppError hierarchy                    │
                  │  - OpenAPI /api/v1 + /api backwards alias      │
                  └───────────────┬────────────────┬───────────────┘
                                  │                │
            ┌─────────────────────┴──────┐         │
            ▼                            ▼         ▼
  ┌───────────────────┐        ┌───────────────┐ ┌───────────────┐
  │ MongoDB (Storage) │        │ Redis (Cache) │ │ Redis Queue   │
  │ - Users & Profiles│        │ - Health state│ │ (BullMQ:      │
  │ - Problems & Tests│        │ - Rate limits │ │  judge-queue) │
  │ - Submissions     │        └───────────────┘ └───────┬───────┘
  └───────────────────┘                                  │
                                                         ▼
                                       ┌───────────────────────────────────┐
                                       │     BullMQ Judge Worker Engine    │
                                       │     (workers/judgeWorker.js)      │
                                       └─────────────────┬─────────────────┘
                                       │ Configured sandbox executor
                                                         ▼
                                       ┌───────────────────────────────────┐
                                       │ Docker Sandboxed Runner Container │
                                       │ (Node, Python, Java, C++, C)      │
                                       │ - CPU & Memory limits (512MB)     │
                                       │ - Read-only filesystem & drop caps│
                                       │ - Network disabled               │
                                       └───────────────────────────────────┘
```

### Layered Breakdown
1. **Routes (`Backend/routes/`)**: Mounts endpoints under `/api/v1` with seamless `/api` aliases. Enforces request ID propagation and strict input schema validation.
2. **Controllers (`Backend/controllers/`)**: HTTP transport mapping, parsing parameters, calling services, and returning standard JSON response envelopes (`{ success: true, data: ... }`).
3. **Services (`Backend/services/`)**: Core business logic (auth, submission queueing, problem retrieval, stats computation, execution dispatch).
4. **Data Access & Models (`Backend/models/`)**: Mongoose schemas with compound indexes (`submissionCount`, `googleId`, `slug`).
5. **Worker (`Backend/workers/judgeWorker.js`)**: Decoupled asynchronous worker consuming `judge-queue`, executing testcases in isolated Docker containers, evaluating verdicts via typed matchers, and publishing atomic updates.

---

## Quick Start

### Option A: One-Command Docker Compose (Recommended)

To start the local application stack (MongoDB, Redis, API, workers, and Frontend):

```bash
# Clone the repository
git clone https://github.com/sahaj1612/ALGO_FORGE.git
cd ALGO_FORGE

# Create environment file
cp .env.example .env

# Start all services
docker compose up -d --build
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:5000](http://localhost:5000)
- **Health Checks**: [http://localhost:5000/api/v1/health/live](http://localhost:5000/api/v1/health/live) and [http://localhost:5000/api/v1/health/ready](http://localhost:5000/api/v1/health/ready)

Docker Compose starts the app services, but code execution also needs a reachable Docker-compatible sandbox executor configured with `SANDBOX_DOCKER_HOST`. See the [local development guide](docs/LOCAL_DEVELOPMENT.md) for setup details and limitations.

To shut down:
```bash
docker compose down
```

---

### Option B: Local Development

For the complete setup, service commands, and environment notes, follow [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md).

#### Prerequisites
- Node.js 20+
- MongoDB running on `mongodb://127.0.0.1:27017/algoforge`
- Redis running on `127.0.0.1:6379`
- Docker Desktop (for sandbox code execution)

#### 1. Backend & Worker Setup
```bash
cd Backend
cp .env.example .env
npm install

# Run database migrations and seed problems
npm run migrate

# Start the API server in dev mode
npm run dev

# In a separate terminal, start the judge worker
node workers/judgeWorker.js
```

#### 2. Frontend Setup
```bash
cd Frontend
cp .env.example .env
npm install
npm run dev
```

---

## Environment Configuration

AlgoForge validates all required environment variables upon server startup via `Backend/config/env.js`. If any required key is missing or invalid, the process terminates immediately with an informative error message.

### Backend (`Backend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | API server listening port | `5000` |
| `NODE_ENV` | Environment mode (`development`, `test`, `production`) | `development` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/algoforge` |
| `REDIS_HOST` | Redis hostname | `127.0.0.1` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens | Required |
| `JWT_EXPIRES_IN`| Token lifespan | `7d` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |

---

## Testing Matrix & Verification

AlgoForge features a comprehensive, zero-flake test suite containing **12 test suites and 61+ automated assertions** across all layers of the platform:

```bash
# Run the complete test matrix
npm test

# Run specific test suites
npm run test:unit         # Output normalization, adapters, auth helpers, input validators
npm run test:integration  # Express routes, auth flow, problems, run, submit API
npm run test:worker       # Queue processing, timeout handling, missing problem resilience
npm run test:e2e          # End-to-end user registration -> solve -> submit -> verdict flow
npm run test:fixtures     # Multi-language sandbox execution fixtures (JS, Python, Java, C++, C)
```

### Pre-Commit Quality Gate
AlgoForge includes a pre-commit verification hook:
```bash
npm run pre-commit
```
This executes:
1. Backend unit tests (4 suites, 25 tests)
2. Frontend lint checks (`eslint .` with 0 warnings)
3. Frontend production build (`vite build`)

---

## Database Migrations & Seed Data

AlgoForge features a database migration runner that guarantees database integrity and idempotency:

```bash
# Execute all pending database migrations
npm run migrate

# Seed or update algorithm problems
npm run seed
```

### Migrations List
- `001_seed_problems.js`: Seeds standard curriculum problems with hidden testcases, starter templates, and constraints.
- `002_ensure_indexes.js`: Enforces sparse unique indexes on `googleId` to allow standard email/password accounts, plus compound search indexes on `slug`, `tags`, and `difficulty`.

---

## Backup and Disaster Recovery

Automated database backup and restore scripts ensure complete operational resilience:

```bash
# Create a timestamped backup of the database
node Backend/scripts/backup.js

# Restore database from a specific backup
node Backend/scripts/restore.js Backend/backups/algoforge-backup-2026-09-14T06-45-00-000Z.json
```
For detailed disaster recovery policies and procedures, see [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md).

---

## API Documentation & Contracts

The AlgoForge REST API is fully documented and versioned under `/api/v1` with `/api` alias compatibility.

- **OpenAPI 3.0 Specification**: Located at [`docs/openapi.yaml`](docs/openapi.yaml).
- **Health Checks**:
  - `GET /health/live` or `GET /api/v1/health/live`: Liveness probe (verifies process is alive).
  - `GET /health/ready` or `GET /api/v1/health/ready`: Readiness probe (verifies MongoDB and Redis connectivity before accepting traffic).
- **Core Endpoints**:
  - `POST /api/v1/auth/register`: Register user
  - `POST /api/v1/auth/login`: Login user and receive JWT
  - `GET /api/v1/problems`: Paginated list of problems with difficulty/tag filtering
  - `GET /api/v1/problems/:idOrSlug`: Retrieve problem details and starter code
  - `POST /api/v1/run`: Run code against public sample or custom testcases
  - `POST /api/v1/submit`: Queue submission for background grading (returns 202 Accepted)
  - `GET /api/v1/submissions/:id`: Poll submission status and verdict

---

## CI/CD Pipeline & Quality Gates

AlgoForge utilizes GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) to guarantee quality on every pull request and push to `main`:

```
 [Pull Request / Push]
        │
        ▼
 [1. Quality Gate: Lint, Format, Types, Unit Tests]
        │
        ▼
 [2. Integration Gate: Redis + Mongo Service Containers + API Tests]
        │
        ▼
 [3. Worker & E2E Gate: Worker Processing + Browser Flow Tests]
        │
        ▼
 [4. Build Gate: Frontend Production Bundle + API Dockerfile Build]
        │
        ▼
 [5. Security Audit: npm audit & vulnerability scanning]
```

---

## Security Architecture & Multi-Tenant Boundaries

AlgoForge implements defense-in-depth isolation for executing untrusted user programs and multi-tenant security boundaries in accordance with **Phase 4**:

- **Hardened Runner**: Rootless execution (`--user 1000:1000`), read-only rootfs (`--read-only`), 64 MB tmpfs (`/tmp:rw,nosuid,size=64m`), dropped Linux capabilities (`--cap-drop=ALL`), `no-new-privileges:true`, and strict seccomp system call filtering.
- **Air-Gapped Execution**: Execution containers run with `--network none` and no mounted Docker sockets or cloud credentials.
- **Multi-Layer Limits**: Per-user concurrency limit (max 3 active jobs), global queue depth cap (500), body size limits (64 KB code, 10 KB testcase), and process execution output limits (512 KB buffer).
- **Rate Limiting & Idempotency**: IP and user sliding-window rate limiters return HTTP 429 with standard `Retry-After` headers. `Idempotency-Key` headers prevent network retries from duplicating judge jobs.
- **Token Rotation & Replay Detection**: Cryptographically signed 15-minute access tokens paired with single-use refresh token rotation and automated lineage invalidation upon replay detection.
- **Role-Based Access Control & Auditing**: Immutable audit trails (`AuditLog`) for problem authoring, retirement, deletion, and GDPR data operations.
- **Data Protection & Portability**: AES-256-GCM encrypted database backups, machine-readable personal data export (`GET /api/v1/user/export`), and complete GDPR right to erasure (`DELETE /api/v1/user/account`).

For full details and threat models, see [docs/SECURITY.md](docs/SECURITY.md).

---

## Supported Execution Environments

| Language | Runtime / Compiler | Sandbox Security |
| :--- | :--- | :--- |
| **JavaScript** | Node.js v20+ | `isolated-vm` / Docker memory capped |
| **Python** | Python 3.11+ | Unbuffered runner, memory & process limits |
| **Java** | OpenJDK 17 | Heap capped (`-Xmx256m`), security manager |
| **C++** | GCC 12 (g++ -O2) | Isolated Linux container, resource capped |
| **C** | GCC 12 (gcc -O2) | Isolated Linux container, resource capped |

---

## Project Structure & Contributor Guides

- [Project structure](docs/PROJECT_STRUCTURE.md): directory map and guidance on where application code, scripts, tests, and documentation belong.
- [Local development](docs/LOCAL_DEVELOPMENT.md): prerequisites and commands for running the app locally or with Docker Compose.
- [Security](docs/SECURITY.md): execution isolation and security boundaries.
- [Backup and restore](docs/BACKUP_RESTORE.md): database backup and recovery procedures.
- [Operations runbooks](docs/RUNBOOKS.md) and [alerting](docs/ALERTING.md): operational response guidance.
- [OpenAPI contract](docs/openapi.yaml): API specification.

---

## License

This project is licensed under the ISC License.
