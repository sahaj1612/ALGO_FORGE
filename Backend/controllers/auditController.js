const auditService = require('../services/auditService');

async function listAuditLogs(req, res, next) {
  try {
    const result = await auditService.queryAuditLogs(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAuditLogs
};
