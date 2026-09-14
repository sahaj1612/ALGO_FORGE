# AlgoForge

> A modern, production-grade algorithm practice and competitive programming platform with sandboxed multi-language code execution, asynchronous queue-driven judging, and comprehensive engineering quality gates.

![AlgoForge homepage](docs/algoforge-home.png)

AlgoForge delivers a high-performance, resilient coding practice environment with an intuitive React/Vite interface, an Express layered backend, an isolated Dockerized code execution sandbox, and BullMQ/Redis worker queues.

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
- [Supported Execution Environments](#supported-execution-environments)

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
                                                         │ Docker socket
                                                         ▼
                                       ┌───────────────────────────────────┐
                                       │ Docker Sandboxed Runner Container │
                                       │ (Node, Python, Java, C++, C)      │
                                       │ - CPU & Memory limits (512MB)     │
                                       │ - Read-only filesystem & drop caps│
                                       │ - Isolated bridge network (none)  │
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

To spin up the entire production-grade stack (MongoDB, Redis, API, Worker, and Frontend) in one command:

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

To shut down:
```bash
docker compose down
```

---

### Option B: Local Development

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
| `MONGO_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/algoforge` |
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

## Supported Execution Environments

| Language | Runtime / Compiler | Sandbox Security |
| :--- | :--- | :--- |
| **JavaScript** | Node.js v20+ | `isolated-vm` / Docker memory capped |
| **Python** | Python 3.11+ | Unbuffered runner, memory & process limits |
| **Java** | OpenJDK 17 | Heap capped (`-Xmx256m`), security manager |
| **C++** | GCC 12 (g++ -O2) | Isolated Linux container, resource capped |
| **C** | GCC 12 (gcc -O2) | Isolated Linux container, resource capped |

---

## License

This project is licensed under the ISC License.
