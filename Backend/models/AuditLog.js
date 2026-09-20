const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  actorEmail: {
    type: String,
    default: 'system'
  },
  actorRole: {
    type: String,
    default: 'admin'
  },
  action: {
    type: String,
    required: true,
    enum: [
      'PROBLEM_CREATE',
      'PROBLEM_UPDATE',
      'PROBLEM_PUBLISH',
      'PROBLEM_RETIRE',
      'PROBLEM_DELETE',
      'USER_ROLE_CHANGE',
      'ACCOUNT_EXPORT',
      'ACCOUNT_DELETE'
    ],
    index: true
  },
  targetType: {
    type: String,
    required: true,
    enum: ['Problem', 'User', 'Submission', 'System']
  },
  targetId: {
    type: String,
    required: true,
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: 'unknown'
  },
  correlationId: {
    type: String,
    default: null
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
