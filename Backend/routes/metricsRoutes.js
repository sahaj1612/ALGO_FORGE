const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');

// GET /api/v1/metrics (or /metrics)
router.get('/', metricsController.getJsonSnapshot);

module.exports = router;
