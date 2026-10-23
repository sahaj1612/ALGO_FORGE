/**
 * Observability & Telemetry Metrics Service
 * Collects latency percentiles, queue wait times, verdict distribution, and error rates.
 * Formats data for both Prometheus (/metrics) and structured JSON (/api/v1/metrics).
 */

const mongoose = require('mongoose');
const judgeQueue = require('../queues/judgeQueue');
const runQueue = require('../queues/runQueue');

// Rolling window for latency calculation (last 1000 requests)
const MAX_LATENCY_SAMPLES = 1000;
const latencySamples = [];

const counters = {
  requestsTotal: 0,
  status2xx: 0,
  status4xx: 0,
  status5xx: 0,
  deadLettersTotal: 0,
  verdicts: {
    accepted: 0,
    wrong_answer: 0,
    time_limit: 0,
    compilation_error: 0,
    runtime_error: 0,
    server_error: 0
  },
  endpointCounts: {}
};

/**
 * Record completed HTTP request
 */
function recordHttpRequest({ method, path, statusCode, durationMs }) {
  counters.requestsTotal++;

  if (statusCode >= 200 && statusCode < 300) counters.status2xx++;
  else if (statusCode >= 400 && statusCode < 500) counters.status4xx++;
  else if (statusCode >= 500) counters.status5xx++;

  const key = `${method} ${path}`;
  counters.endpointCounts[key] = (counters.endpointCounts[key] || 0) + 1;

  if (typeof durationMs === 'number' && durationMs >= 0) {
    if (latencySamples.length >= MAX_LATENCY_SAMPLES) {
      latencySamples.shift();
    }
    latencySamples.push(durationMs);
  }
}

/**
 * Record judged submission verdict
 */
function recordVerdict(verdict) {
  if (verdict && counters.verdicts[verdict] !== undefined) {
    counters.verdicts[verdict]++;
  }
}

/**
 * Record a dead-letter / permanently failed job
 */
function recordDeadLetter() {
  counters.deadLettersTotal++;
}

/**
 * Compute percentile from recorded samples
 */
function computePercentile(samples, p) {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
  return Number(sorted[index].toFixed(2));
}

/**
 * Fetch queue counts safely
 */
async function getQueueMetrics(queue) {
  try {
    if (!queue || typeof queue.getJobCounts !== 'function') {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, oldestAgeSec: 0 };
    }
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    
    // Estimate oldest waiting job age
    let oldestAgeSec = 0;
    try {
      const waitingJobs = await queue.getJobs(['waiting'], 0, 1);
      if (waitingJobs && waitingJobs.length > 0 && waitingJobs[0].timestamp) {
        oldestAgeSec = Math.max(0, Math.round((Date.now() - waitingJobs[0].timestamp) / 1000));
      }
    } catch {}

    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      oldestAgeSec
    };
  } catch {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, oldestAgeSec: 0 };
  }
}

/**
 * Collect full structured metrics payload
 */
async function getMetricsSnapshot() {
  const p50 = computePercentile(latencySamples, 50);
  const p95 = computePercentile(latencySamples, 95);
  const p99 = computePercentile(latencySamples, 99);

  const [judgeQ, runQ] = await Promise.all([
    getQueueMetrics(judgeQueue),
    getQueueMetrics(runQueue)
  ]);

  const mem = process.memoryUsage();

  let mongoPingMs = null;
  let mongoStatus = 'disconnected';
  if (mongoose.connection.readyState === 1) {
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      mongoPingMs = Date.now() - start;
      mongoStatus = 'connected';
    } catch {
      mongoStatus = 'degraded';
    }
  }

  return {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    http: {
      totalRequests: counters.requestsTotal,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      statusCounts: {
        '2xx': counters.status2xx,
        '4xx': counters.status4xx,
        '5xx': counters.status5xx
      },
      activeSamplesCount: latencySamples.length
    },
    queues: {
      judgeQueue: judgeQ,
      runQueue: runQ,
      deadLettersTotal: counters.deadLettersTotal + (judgeQ.failed || 0)
    },
    verdicts: { ...counters.verdicts },
    system: {
      memoryRssMb: Number((mem.rss / (1024 * 1024)).toFixed(2)),
      heapUsedMb: Number((mem.heapUsed / (1024 * 1024)).toFixed(2)),
      heapTotalMb: Number((mem.heapTotal / (1024 * 1024)).toFixed(2))
    },
    database: {
      mongo: mongoStatus,
      pingMs: mongoPingMs
    }
  };
}

/**
 * Format snapshot as Prometheus exposition text format
 */
async function getPrometheusMetrics() {
  const snapshot = await getMetricsSnapshot();

  const lines = [
    '# HELP algoforge_uptime_seconds Process uptime in seconds',
    '# TYPE algoforge_uptime_seconds gauge',
    `algoforge_uptime_seconds ${snapshot.uptimeSeconds}`,
    '',
    '# HELP algoforge_http_requests_total Total number of HTTP requests handled',
    '# TYPE algoforge_http_requests_total counter',
    `algoforge_http_requests_total{status_class="2xx"} ${snapshot.http.statusCounts['2xx']}`,
    `algoforge_http_requests_total{status_class="4xx"} ${snapshot.http.statusCounts['4xx']}`,
    `algoforge_http_requests_total{status_class="5xx"} ${snapshot.http.statusCounts['5xx']}`,
    '',
    '# HELP algoforge_http_request_duration_ms HTTP request latency percentiles',
    '# TYPE algoforge_http_request_duration_ms summary',
    `algoforge_http_request_duration_ms{quantile="0.5"} ${snapshot.http.p50LatencyMs}`,
    `algoforge_http_request_duration_ms{quantile="0.95"} ${snapshot.http.p95LatencyMs}`,
    `algoforge_http_request_duration_ms{quantile="0.99"} ${snapshot.http.p99LatencyMs}`,
    '',
    '# HELP algoforge_queue_depth Number of jobs in BullMQ queues by state',
    '# TYPE algoforge_queue_depth gauge',
    `algoforge_queue_depth{queue="judge-queue",state="waiting"} ${snapshot.queues.judgeQueue.waiting}`,
    `algoforge_queue_depth{queue="judge-queue",state="active"} ${snapshot.queues.judgeQueue.active}`,
    `algoforge_queue_depth{queue="judge-queue",state="failed"} ${snapshot.queues.judgeQueue.failed}`,
    `algoforge_queue_depth{queue="run-queue",state="waiting"} ${snapshot.queues.runQueue.waiting}`,
    `algoforge_queue_depth{queue="run-queue",state="active"} ${snapshot.queues.runQueue.active}`,
    '',
    '# HELP algoforge_queue_oldest_job_age_seconds Oldest waiting job age in seconds',
    '# TYPE algoforge_queue_oldest_job_age_seconds gauge',
    `algoforge_queue_oldest_job_age_seconds{queue="judge-queue"} ${snapshot.queues.judgeQueue.oldestAgeSec}`,
    `algoforge_queue_oldest_job_age_seconds{queue="run-queue"} ${snapshot.queues.runQueue.oldestAgeSec}`,
    '',
    '# HELP algoforge_dead_letters_total Total failed or dead-lettered jobs',
    '# TYPE algoforge_dead_letters_total counter',
    `algoforge_dead_letters_total ${snapshot.queues.deadLettersTotal}`,
    '',
    '# HELP algoforge_submissions_total Total judged submissions by verdict',
    '# TYPE algoforge_submissions_total counter'
  ];

  for (const [verdict, count] of Object.entries(snapshot.verdicts)) {
    lines.push(`algoforge_submissions_total{verdict="${verdict}"} ${count}`);
  }

  lines.push('');
  lines.push('# HELP algoforge_memory_rss_bytes Resident set size in bytes');
  lines.push('# TYPE algoforge_memory_rss_bytes gauge');
  lines.push(`algoforge_memory_rss_bytes ${Math.round(snapshot.system.memoryRssMb * 1024 * 1024)}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Reset metric counters (useful in testing)
 */
function resetMetrics() {
  counters.requestsTotal = 0;
  counters.status2xx = 0;
  counters.status4xx = 0;
  counters.status5xx = 0;
  counters.deadLettersTotal = 0;
  latencySamples.length = 0;
  for (const key of Object.keys(counters.verdicts)) {
    counters.verdicts[key] = 0;
  }
}

module.exports = {
  recordHttpRequest,
  recordVerdict,
  recordDeadLetter,
  getMetricsSnapshot,
  getPrometheusMetrics,
  resetMetrics,
  computePercentile
};
