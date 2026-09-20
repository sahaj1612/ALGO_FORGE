const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');

/**
 * Record an immutable audit log entry for a critical action
 */
async function recordAuditLog({
  actor,
  action,
  targetType,
  targetId,
  details = {},
  req = null
}) {
  try {
    const User = require('../models/User');
    const actorId = actor?.id || actor?._id || req?.user?.id || 'system';
    let actorEmail = actor?.email || req?.adminUser?.email || req?.user?.email;
    let actorRole = actor?.role || req?.adminUser?.role || req?.user?.role || 'admin';

    if (!actorEmail && actorId !== 'system' && mongoose.Types.ObjectId.isValid(actorId)) {
      const u = await User.findById(actorId).select('email role').lean();
      if (u) {
        actorEmail = u.email;
        actorRole = u.role || actorRole;
      }
    }

    actorEmail = actorEmail || 'system@algoforge.internal';

    const ipAddress = req
      ? (req.ip || req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown')
      : 'system';

    const correlationId = req?.id || null;

    return await AuditLog.create({
      actorId: mongoose.Types.ObjectId.isValid(actorId) ? actorId : new mongoose.Types.ObjectId(),
      actorEmail,
      actorRole,
      action,
      targetType,
      targetId: String(targetId),
      details,
      ipAddress,
      correlationId
    });
  } catch (err) {
    console.error('[Audit Service Error] Failed to write audit log:', err.message);
    return null;
  }
}

/**
 * Retrieve audit logs with cursor pagination and optional action/target filters
 */
async function queryAuditLogs({ limit = 50, cursor, action, targetType }) {
  const pageLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const filter = {};

  if (action) {
    filter.action = action;
  }

  if (targetType) {
    filter.targetType = targetType;
  }

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const items = await AuditLog.find(filter)
    .sort({ _id: -1 })
    .limit(pageLimit + 1);

  const hasNext = items.length > pageLimit;
  const pageItems = hasNext ? items.slice(0, pageLimit) : items;
  const nextCursor = hasNext && pageItems.length > 0 ? pageItems[pageItems.length - 1]._id.toString() : null;

  return {
    items: pageItems,
    nextCursor,
    count: pageItems.length
  };
}

module.exports = {
  recordAuditLog,
  queryAuditLogs
};
