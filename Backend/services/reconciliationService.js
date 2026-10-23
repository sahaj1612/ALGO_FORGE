const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const judgeQueue = require('../queues/judgeQueue');
const logger = require('../utils/logger');
const auditService = require('./auditService');

const DEFAULT_STALL_THRESHOLD_MS = 60 * 1000; // 60 seconds
const MAX_RECONCILIATION_RETRIES = 2;

/**
 * Reconcile submissions stuck in pending or running state.
 * Guarantees Phase 5 SLA: Zero lost accepted jobs.
 */
async function reconcileStalledSubmissions({
  stallThresholdMs = DEFAULT_STALL_THRESHOLD_MS,
  maxRetries = MAX_RECONCILIATION_RETRIES
} = {}) {
  const cutoffTime = new Date(Date.now() - stallThresholdMs);

  const stalledSubmissions = await Submission.find({
    status: { $in: ['pending', 'running'] },
    $or: [
      { heartbeatAt: { $lt: cutoffTime } },
      { heartbeatAt: null, createdAt: { $lt: cutoffTime } },
      { heartbeatAt: { $exists: false }, createdAt: { $lt: cutoffTime } }
    ]
  }).limit(50);

  const results = {
    checkedCount: stalledSubmissions.length,
    retriedCount: 0,
    reconciledToErrorCount: 0,
    details: []
  };

  if (stalledSubmissions.length === 0) {
    return results;
  }

  logger.warn(`Reconciliation: Found ${stalledSubmissions.length} stalled submissions past ${stallThresholdMs}ms threshold`);

  for (const sub of stalledSubmissions) {
    const subId = sub._id.toString();
    const retriesSoFar = sub.reconciliationRetries || 0;

    // Check BullMQ job state if queue is connected
    let jobInQueue = null;
    try {
      if (judgeQueue && typeof judgeQueue.getJob === 'function') {
        const jobs = await judgeQueue.getJobs(['waiting', 'active', 'delayed'], 0, 100);
        jobInQueue = jobs.find(j => j?.data?.submissionId === subId);
      }
    } catch (qErr) {
      logger.warn(`Reconciliation: Failed to query queue for sub ${subId}: ${qErr.message}`);
    }

    // If job is still actively tracked and recent in queue, give it grace
    if (jobInQueue) {
      results.details.push({
        submissionId: subId,
        action: 'skipped_active_in_queue'
      });
      continue;
    }

    if (retriesSoFar < maxRetries) {
      // Safe retry
      try {
        await judgeQueue.add('judge-job', {
          submissionId: subId,
          correlationId: sub.correlationId || `reconcile-${Date.now()}`
        });

        await Submission.findByIdAndUpdate(subId, {
          status: 'pending',
          $inc: { reconciliationRetries: 1 },
          heartbeatAt: new Date()
        });

        results.retriedCount++;
        results.details.push({
          submissionId: subId,
          action: 'requeued',
          retryNumber: retriesSoFar + 1
        });

        logger.info(`Reconciliation: Re-queued stalled submission ${subId} (attempt ${retriesSoFar + 1}/${maxRetries})`);
      } catch (retryErr) {
        logger.error(`Reconciliation: Failed to requeue ${subId}: ${retryErr.message}`);
      }
    } else {
      // Terminal reconciliation to server_error so client poll does not hang forever
      const failureReason = `Execution stalled and exceeded ${maxRetries} reconciliation retries. Worker may have terminated unexpectedly.`;
      
      await Submission.findByIdAndUpdate(subId, {
        status: 'server_error',
        error: failureReason,
        heartbeatAt: new Date()
      });

      results.reconciledToErrorCount++;
      results.details.push({
        submissionId: subId,
        action: 'marked_server_error',
        reason: failureReason
      });

      logger.warn(`Reconciliation: Marked submission ${subId} as terminal server_error`);

      // Record audit log for incident review
      await auditService.recordAuditLog({
        actor: { id: 'reconciler', email: 'reconciler@algoforge.system', role: 'system' },
        action: 'SUBMISSION_RECONCILED',
        targetType: 'Submission',
        targetId: subId,
        details: { failureReason, retriesSoFar }
      });
    }
  }

  return results;
}

let cronInterval = null;

function startReconciliationCron(intervalMs = 30000) {
  if (cronInterval) return;

  cronInterval = setInterval(async () => {
    try {
      await reconcileStalledSubmissions();
    } catch (err) {
      logger.error(`Reconciliation cron error: ${err.message}`);
    }
  }, intervalMs);

  if (typeof cronInterval.unref === 'function') {
    cronInterval.unref();
  }

  logger.info(`Reconciliation cron scheduled every ${intervalMs / 1000}s`);
}

function stopReconciliationCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
}

module.exports = {
  reconcileStalledSubmissions,
  startReconciliationCron,
  stopReconciliationCron,
  DEFAULT_STALL_THRESHOLD_MS
};
