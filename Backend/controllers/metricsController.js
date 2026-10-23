const metricsService = require('../services/metricsService');

/**
 * Handle Prometheus scrape requests (GET /metrics)
 */
async function getPrometheus(req, res, next) {
  try {
    const text = await metricsService.getPrometheusMetrics();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(text);
  } catch (error) {
    next(error);
  }
}

/**
 * Handle structured JSON metrics (GET /api/v1/metrics)
 */
async function getJsonSnapshot(req, res, next) {
  try {
    const data = await metricsService.getMetricsSnapshot();
    res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPrometheus,
  getJsonSnapshot
};
