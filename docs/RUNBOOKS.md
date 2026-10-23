# AlgoForge Operations Runbooks

Actionable incident response and maintenance runbooks for the AlgoForge platform in accordance with **Phase 5 — Production Platform, Observability and Scale**.

---

## Runbook Index

1. [Alert: API 5xx Error Spike](#1-alert-api-5xx-error-spike)
2. [Alert: Service Readiness Probe Failure](#2-alert-service-readiness-probe-failure)
3. [Alert: Elevated Queue Wait Age & Depth](#3-alert-elevated-queue-wait-age--depth)
4. [Alert: Worker Crash Loops & Heartbeat Timeouts](#4-alert-worker-crash-loops--heartbeat-timeouts)
5. [Alert: Dead-Letter & Failed Job Accumulation](#5-alert-dead-letter--failed-job-accumulation)
6. [Alert: Sandbox Runner Execution Errors](#6-alert-sandbox-runner-execution-errors)
7. [Alert: Database Replica Degraded](#7-alert-database-replica-degraded)
8. [Procedure: Disaster Recovery & Automated Restore Drill](#8-procedure-disaster-recovery--automated-restore-drill)

---

## 1. Alert: API 5xx Error Spike

### Symptoms
- `algoforge_http_requests_total{status_class="5xx"}` exceeds 1% of traffic over a 5-minute window.
- Edge load balancer returns 502 / 503 / 504.

### Triage Steps
1. Inspect live application logs filtered by HTTP 500 status and correlation IDs:
   ```bash
   docker logs --tail 200 -f algoforge-api | grep '"statusCode":5'
   ```
2. Check dependency connectivity:
   ```bash
   curl http://localhost:5000/health/ready
   ```
3. Check Node.js process memory:
   ```bash
   curl http://localhost:5000/api/v1/metrics | grep memoryRssMb
   ```

### Mitigation
- If database connection pool is saturated, scale MongoDB connection limits or restart idle pool connections.
- If unhandled exceptions occurred on a specific payload, inspect the logged `correlationId` and apply hotfix schema validation.
- Roll back to previous immutable deployment image if regression was introduced.

---

## 2. Alert: Service Readiness Probe Failure

### Symptoms
- `/health/ready` returns HTTP 503 Service Unavailable.
- Kubernetes / ECS or Docker Compose halts traffic routing to the instance.

### Triage Steps
1. Query health details:
   ```bash
   curl http://localhost:5000/health/ready
   ```
   Inspect which subsystem is disconnected (`mongo` or `redis`).
2. Verify container state:
   ```bash
   docker compose ps
   ```

### Mitigation
- **Redis Down**: Check container logs: `docker logs algoforge-redis`. Ensure Redis AOF file isn't corrupted (`redis-check-aof --fix /data/appendonly.aof`). Restart container.
- **MongoDB Down**: Verify disk space on `/data/db`. If replica set stepdown occurred, verify primary election.

---

## 3. Alert: Elevated Queue Wait Age & Depth

### Symptoms
- `algoforge_queue_oldest_job_age_seconds{queue="judge-queue"}` > 30s.
- `algoforge_queue_depth{queue="judge-queue",state="waiting"}` > 100.
- Controlled backpressure triggers (`503 QUEUE_LATENCY_ELEVATED`).

### Triage Steps
1. Check queue metrics snapshot:
   ```bash
   curl http://localhost:5000/api/v1/metrics
   ```
2. Check worker status:
   ```bash
   docker compose ps algoforge-worker-submit algoforge-worker-run
   ```

### Mitigation
- **Add Worker Capacity**: Scale the worker pool horizontally:
  ```bash
  docker compose up -d --scale worker-submit=4 --scale worker-run=4
  ```
- **Inspect Long-Running Submissions**: Check if single submissions are hitting maximum wall-clock timeouts and starving execution threads.
- Backpressure will automatically protect API availability until backlog drops below safety threshold.

---

## 4. Alert: Worker Crash Loops & Heartbeat Timeouts

### Symptoms
- Worker container repeatedly exits with non-zero status.
- Stalled submissions accumulate with stale `heartbeatAt`.

### Triage Steps
1. Inspect worker stderr:
   ```bash
   docker logs --tail 100 algoforge-worker-submit
   ```
2. Check for OOM kills (`Exit Code 137`):
   ```bash
   docker inspect algoforge-worker-submit | grep OOMKilled
   ```

### Mitigation
- If Docker socket permissions changed on host, verify `/var/run/docker.sock` ownership.
- The background `reconciliationService` automatically sweeps stalled jobs, increments retry counts, and moves abandoned jobs to `server_error` so clients never hang.
- To trigger on-demand reconciliation:
  ```bash
  node -e "require('./Backend/services/reconciliationService').reconcileStalledSubmissions({ stallThresholdMs: 30000 })"
  ```

---

## 5. Alert: Dead-Letter & Failed Job Accumulation

### Symptoms
- `algoforge_dead_letters_total` > 0 or spike in failed BullMQ jobs.

### Triage Steps
1. Query failed jobs in BullMQ:
   ```javascript
   const judgeQueue = require('./Backend/queues/judgeQueue');
   judgeQueue.getJobs(['failed'], 0, 10).then(console.log);
   ```
2. Inspect failure reasons (e.g. Docker daemon unreachable, disk full, corrupt problem document).

### Mitigation
- Fix the underlying runtime condition (e.g. restart Docker engine).
- Retry failed dead-letter jobs:
  ```javascript
  const jobs = await judgeQueue.getJobs(['failed']);
  for (const j of jobs) await j.retry();
  ```

---

## 6. Alert: Sandbox Runner Execution Errors

### Symptoms
- High proportion of `server_error` verdicts instead of user compilation/runtime errors.

### Triage Steps
1. Check runner image availability:
   ```bash
   docker images | grep algoforge-sandbox
   ```
2. Verify Docker daemon API responsiveness:
   ```bash
   docker info
   ```

### Mitigation
- Rebuild sandbox image:
  ```bash
  docker build -t algoforge-sandbox:latest Backend/sandbox/
  ```

---

## 7. Alert: Database Replica Degraded

### Symptoms
- MongoDB replica set reports non-healthy member or latency spike.

### Triage Steps
1. Connect to Mongo shell:
   ```bash
   mongosh --eval "rs.status()"
   ```
2. Inspect replica lag:
   ```bash
   mongosh --eval "rs.printSecondaryReplicationInfo()"
   ```

### Mitigation
- Restart lagging replica node. Ensure network connectivity within cluster VPC.

---

## 8. Procedure: Disaster Recovery & Automated Restore Drill

Run regular automated restore drills to guarantee backup recoverability:

```bash
cd Backend
node scripts/restoreDrill.js
```

### Verification Criteria
- [x] Encrypted snapshot generated with AES-256-GCM.
- [x] Decryption passes authentication tag verification without tampering.
- [x] Record counts match active database.
- [x] Schema integrity checks pass across all collections.
