# Project Structure

AlgoForge is a JavaScript monorepo. The repository root contains shared tooling
and the local Docker Compose stack; application code is split between `Backend/`
and `Frontend/`.

```text
.
├── .github/workflows/       # Continuous integration
├── Backend/
│   ├── config/              # Environment and service configuration
│   ├── controllers/         # HTTP request/response handlers
│   ├── data/                # Source problem data
│   ├── middleware/          # Authentication, validation, limits, security
│   ├── models/              # MongoDB/Mongoose schemas
│   ├── queues/              # BullMQ queue definitions
│   ├── routes/              # API route registration
│   ├── sandbox/             # Runner image and sandbox policy
│   ├── scripts/
│   │   ├── migrations/      # Database migrations
│   │   ├── dev/             # Manual local debugging helpers
│   │   └── legacy/          # Retained prototype scripts; not for normal use
│   ├── services/            # Application and judging logic
│   ├── shared/              # Shared constants and API types
│   ├── tests/               # Unit, integration, worker, E2E and fixtures
│   ├── workers/             # Asynchronous run and judge workers
│   ├── server.js            # API entry point
│   └── package.json         # Backend scripts and dependencies
├── Frontend/
│   ├── public/              # Static public assets
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Application state and authentication
│   │   ├── pages/           # Routed screens
│   │   ├── types/           # Shared frontend type declarations
│   │   └── ...              # Styles, data, assets and constants
│   ├── Dockerfile           # Static-site container build
│   └── package.json         # Frontend scripts and dependencies
├── docs/                    # Architecture, API, security and operations docs
├── scripts/                 # Repository-level developer tooling
├── docker-compose.yml       # Local service orchestration
├── package.json             # Monorepo shortcuts for tests, lint and builds
└── README.md                # Project overview and quick start
```

## Where to make changes

- Add API endpoints in `Backend/routes/` and their HTTP handlers in
  `Backend/controllers/`; put business rules in `Backend/services/`.
- Add or change MongoDB schemas in `Backend/models/`. Keep migrations and
  repeatable data setup in `Backend/scripts/`.
- Keep judge execution in the worker and sandbox layers. Do not run untrusted
  user code in an API request handler.
- Add automated checks under the matching folder in `Backend/tests/`.
- Add UI screens under `Frontend/src/pages/`; reusable UI belongs in
  `Frontend/src/components/`.
- Put contributor instructions and operational procedures in `docs/` and link
  them from the root README.

## Local-only data and secrets

Environment files are created from the checked-in `.env.example` templates.
Never commit `.env` files, database exports, user data, or real secrets. Backup
and restore commands are documented in [BACKUP_RESTORE.md](BACKUP_RESTORE.md).

`Backend/scripts/legacy/seedPrototype.js` is retained for historical reference.
It deletes the existing problem collection; use the current idempotent
`npm run seed` workflow instead.
