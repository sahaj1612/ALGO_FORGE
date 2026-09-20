const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminMiddleware');
const auditController = require('../controllers/auditController');

// Admin-only audit log querying
router.get('/', auth, adminAuth, auditController.listAuditLogs);

module.exports = router;
