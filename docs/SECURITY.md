# AlgoForge Security & Multi-Tenant Trust Boundaries

This document defines the production security architecture, threat model, mitigation controls, and operational runbooks for **AlgoForge** in accordance with **Phase 4 — Security and Multi-Tenant Trust Boundaries**.

---

## 1. Threat Model & Trust Boundaries

An online judge environment executes hostile, untrusted, arbitrary user-submitted code in multiple programming languages. AlgoForge enforces strict defense-in-depth isolation across all layers:

```
[Browser Client]
       │ TLS 1.3 / HTTPS
       ▼
[Edge / Reverse Proxy] ── HSTS, CSP, X-Frame-Options: DENY, nosniff
       │ Strict CORS Allowlist & Rate Limiting (IP & User)
       ▼
[Express API Gateway] ── Allowlist Validation + Short-Lived JWT + RBAC
       │ Idempotency Key De-duplication + Concurrency Limits
       ▼
[BullMQ / Redis Job Queue] ── Backlog Cap & Isolation
       │
       ▼
[Judge Worker Host] ── Worker with no external network exposure
       │
       ▼
[Hardened Ephemeral Docker Sandbox]
       ├── Rootless UID/GID 1000:1000
       ├── Read-Only Root Filesystem (`--read-only`)
       ├── Ephemeral Memory-Capped tmpfs (`/tmp:rw,nosuid,size=64m`)
       ├── All Linux Capabilities Dropped (`--cap-drop=ALL`)
       ├── Privilege Escalation Blocked (`no-new-privileges:true`)
       ├── Strict Seccomp Profile (`SCMP_ACT_ERRNO` allowlist)
       └── Network Disabled (`--network none`)
       │
       ▼
[Sanitized Verdict & Diagnostics] ── Strips ANSI, redacts host paths, zero test leak
       │
       ▼
[Encrypted Storage / Audit Trail] ── AES-256-GCM Backups & Immutable Audit Logs
```

---

## 2. Hardened Runner Environment (Isolation Controls)

Every code run and judged submission executes inside an ephemeral container governed by strict security flags:

1. **Rootless Execution (`--user 1000:1000`)**: The container process runs as a non-privileged `sandbox` user, ensuring that even in the unlikely event of container escape, the attacker has no root permissions on the host.
2. **Read-Only Root Filesystem (`--read-only`)**: Prevents any modification of container binaries, dynamic libraries, or system paths.
3. **Restricted tmpfs Mount (`/tmp:rw,nosuid,size=64m`)**: Provides temporary compilation workspace capped at 64 MB with `nosuid` enabled to prevent SUID-based privilege escalation.
4. **All Capabilities Dropped (`--cap-drop=ALL`)**: Disables `CAP_NET_RAW`, `CAP_SYS_ADMIN`, `CAP_DAC_OVERRIDE`, and all kernel capabilities.
5. **No New Privileges (`--security-opt no-new-privileges:true`)**: Guarantees that child processes cannot acquire additional privileges via `setuid` or file capabilities.
6. **Air-Gapped Network (`--network none`)**: Total network isolation prevents outbound data exfiltration, reverse shells, or access to internal cloud metadata endpoints (e.g. AWS `169.254.169.254`).
7. **Seccomp System Call Filtering (`seccomp.json`)**: Configured with default `SCMP_ACT_ERRNO`, strictly allowlisting only necessary computational and filesystem syscalls (`read`, `write`, `execve`, `mmap`, etc.).
8. **Host Filesystem Protection**: The workspace directory is mounted strictly read-only (`:ro`). The Docker daemon socket (`/var/run/docker.sock`), cloud credentials, and host storage paths are never mounted.

---

## 3. Multi-Layer Abuse & Denial-of-Service Defense

To prevent queue monopolization, memory exhaustion, or cluster starvation:

| Control Layer | Enforcement Mechanism | Limit / Threshold | HTTP Status |
|---|---|---|---|
| **Per-User Concurrency** | `Backend/middleware/queueLimits.js` | Max 3 active (`pending`/`running`) jobs per user | `429 Too Many Requests` (Retry-After) |
| **Global Queue Depth** | `Backend/middleware/queueLimits.js` | Max 500 queued jobs before backpressure triggers | `503 Service Unavailable` |
| **Request Payload Size** | Express JSON parser limit | Max 64 KB solution code, Max 10 KB custom testcase | `400 Bad Request` |
| **Output Buffer Limits** | `spawnSync` output cap + truncation | Max 512 KB process buffer, 32 KB client output truncation | Truncated with diagnostic note |
| **Authentication Rate Limits** | IP-based memory sliding window | Max 10 login attempts per 15 min, max 5 registrations / hr | `429 Too Many Requests` (Retry-After) |
| **Execution Rate Limits** | User & IP sliding window | Max 30 runs/min, 15 submissions/min, 120 polls/min | `429 Too Many Requests` |
| **Network Idempotency** | `Backend/middleware/idempotency.js` | `Idempotency-Key` prevents double-submission duplication | Cached `202 Accepted` |

---

## 4. Allowlist Schema Validation & Diagnostic Sanitization

1. **Input Validation**: All API bodies and query parameters pass through `Backend/middleware/validator.js`. Extra or unexpected keys are rejected or stripped.
2. **ANSI Escape Code Stripping**: Output returned from compiler or runtime stdout/stderr is stripped of ANSI escape sequences to prevent terminal spoofing or terminal control exploits.
3. **Host Path Redaction**: Absolute paths matching `/workspace/` or host drive paths are sanitized to generic file names (`solution.cpp:10`).
4. **Confidential Testcase Shielding**: Hidden evaluation testcases are evaluated strictly within the worker. The API contract strictly redacts raw inputs and expected outputs for hidden testcases, returning only status (`passed` / `wrong_answer`) and metrics.
5. **Magic Byte Image Verification**: Profile image uploads are verified against binary magic numbers (`0xFF 0xD8 0xFF` for JPEG, `0x89 0x50 0x4E 0x47` for PNG, WebP RIFF header). SVG, HTML, scripts, and spoofed extensions are unconditionally rejected.

---

## 5. Authentication & Credential Lifecycle

1. **Short-Lived Access Tokens**: JWT access tokens are cryptographically signed and expire after 15 minutes.
2. **Refresh Token Rotation**: Refresh tokens are single-use, hashed with SHA-256 before storage in MongoDB, and rotate upon every refresh call (`POST /api/v1/auth/refresh`).
3. **Reuse Detection & Session Revocation**: If an already-rotated or revoked refresh token is replayed, all active sessions for that token family are immediately revoked as an indicator of compromise.
4. **Strict CORS Policy**: Configured strictly to allow authorized client origins (`CLIENT_URL`), blocking unauthorized cross-origin requests.
5. **Security Headers**: All API responses include `Strict-Transport-Security` (HSTS), `Content-Security-Policy` (CSP), `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.

---

## 6. Role-Based Access Control & Immutable Audit Logging

1. **Role Enforcement**: Authoring endpoints (`POST /api/v1/problems/admin`, `PUT`, `DELETE`) require `role: admin`.
2. **Audit Logging**: Every critical action (`PROBLEM_CREATE`, `PROBLEM_PUBLISH`, `PROBLEM_RETIRE`, `PROBLEM_DELETE`, `ACCOUNT_EXPORT`, `ACCOUNT_DELETE`) generates an immutable document in `AuditLog` recording actor ID, email, role, IP address, timestamp, and correlation ID.
3. **Audit Querying**: Accessible only to administrators via `GET /api/v1/admin/audit-logs`.

---

## 7. GDPR Data Retention, Encryption & Portability

1. **Encrypted Backups**: Database backups generated by `scripts/backup.js` support AES-256-GCM authenticated encryption using `BACKUP_ENCRYPTION_KEY`.
2. **Account Data Export (Portability)**: `GET /api/v1/user/export` generates a comprehensive, machine-readable JSON archive containing the user's profile and historical submissions.
3. **Right to Erasure (Permanent Deletion)**: `DELETE /api/v1/user/account` permanently deletes the user record, active refresh tokens, and submission history from the database.

---

## 8. Incident Response Runbook

```
1. ANOMALY DETECTED (Escape signal, error spike, queue flood, auth anomaly)
   │
   ▼
2. CORRELATION & TRIAGE
   ├── Inspect correlation IDs: grep req.id in logger output
   ├── Query audit logs: GET /api/v1/admin/audit-logs
   └── Inspect queue health: GET /health/ready
   │
   ▼
3. CONTAINMENT
   ├── If abuse identified: Ban actor or toggle queue limit thresholds
   ├── If runner compromised: Quarantine runner node / restart docker container pool
   └── If credential exposed: Rotate JWT_SECRET and REFRESH_TOKEN_SECRET immediately
   │
   ▼
4. POST-INCIDENT REVIEW
   └── Execute full test suite: npm test
```
