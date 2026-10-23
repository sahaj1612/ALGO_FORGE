# AlgoForge Prometheus Alert Rules & SLO Specification

This document specifies the Service Level Objectives (SLOs) and production Prometheus alerting rules for **AlgoForge** in accordance with **Phase 5 — Production Platform, Observability and Scale**.

---

## 1. Service Level Objectives (SLOs)

| Metric | Target | Measurement Window | Alert Condition |
|---|---|---|---|
| **API Availability** | **>= 99.9%** | Monthly (excluding planned maintenance) | 5xx error rate > 0.1% over 5m |
| **Submission Acceptance Latency** | **p95 < 300 ms** | 5-minute rolling window | p95 latency > 300 ms |
| **Submission Queue Wait Time** | **95% < 10s** | 5-minute rolling window | Oldest wait age > 10s |
| **Job Durability** | **100%** (Zero lost jobs) | Continuous | Orphaned jobs > 0 after reconciliation |
| **Readiness Health** | **100%** | Continuous probe | `/health/ready` != 200 for > 30s |

---

## 2. Prometheus Alerting Rules (`alerts.yml`)

```yaml
groups:
  - name: algoforge_production_alerts
    rules:
      - alert: ApiHigh5xxErrorRate
        expr: (sum(rate(algoforge_http_requests_total{status_class="5xx"}[5m])) / sum(rate(algoforge_http_requests_total[5m]))) * 100 > 1.0
        for: 2m
        labels:
          severity: critical
          service: api
        annotations:
          summary: "API 5xx error rate exceeded 1%"
          description: "High rate of server errors detected on {{ $labels.instance }}. Check RUNBOOKS.md #1."

      - alert: ServiceReadinessProbeFailed
        expr: probe_success{job="algoforge_ready"} == 0
        for: 30s
        labels:
          severity: critical
          service: api
        annotations:
          summary: "AlgoForge readiness probe failed"
          description: "MongoDB or Redis connection is degraded. Check RUNBOOKS.md #2."

      - alert: SubmissionQueueAgeElevated
        expr: algoforge_queue_oldest_job_age_seconds{queue="judge-queue"} > 30
        for: 1m
        labels:
          severity: warning
          service: queue
        annotations:
          summary: "Judge queue oldest waiting job exceeded 30 seconds"
          description: "Submissions are waiting longer than SLO threshold. Scale workers. Check RUNBOOKS.md #3."

      - alert: RunQueueAgeElevated
        expr: algoforge_queue_oldest_job_age_seconds{queue="run-queue"} > 15
        for: 1m
        labels:
          severity: warning
          service: queue
        annotations:
          summary: "Interactive run queue oldest waiting job exceeded 15 seconds"
          description: "Interactive runs are experiencing delays. Check RUNBOOKS.md #3."

      - alert: DeadLetterJobDetected
        expr: increase(algoforge_dead_letters_total[5m]) > 0
        for: 0m
        labels:
          severity: warning
          service: worker
        annotations:
          summary: "Dead-letter or failed job detected in BullMQ"
          description: "Job failed after maximum retries. Check RUNBOOKS.md #5."

      - alert: HighMemoryUsage
        expr: algoforge_memory_rss_bytes > 1073741824 # 1 GB
        for: 5m
        labels:
          severity: warning
          service: api
        annotations:
          summary: "Node.js process RSS memory exceeded 1 GB"
          description: "Potential memory leak or heavy payload volume. Check metrics."
```
