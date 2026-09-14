const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const judgeQueue = require('../queues/judgeQueue');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../utils/errors');
const { SUPPORTED_LANGUAGES, isTerminalVerdict } = require('../shared/constants');

async function createSubmission({ userId, problemId, code, language = 'javascript' }) {
  if (!code?.trim() || !problemId) {
    throw new BadRequestError('Valid code and problemId are required.');
  }

  const cleanLang = language.toLowerCase();
  if (!SUPPORTED_LANGUAGES.includes(cleanLang)) {
    throw new BadRequestError(`Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }

  let problem = null;
  const cleanId = String(problemId).trim();
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    problem = await Problem.findById(cleanId);
  }
  if (!problem) {
    problem = await Problem.findOne({ slug: cleanId.toLowerCase() });
  }
  if (!problem) {
    throw new NotFoundError('Problem not found.');
  }

  if (problem.status !== 'published') {
    throw new BadRequestError('Cannot submit to an unpublished or retired problem.');
  }

  const submission = await Submission.create({
    userId,
    problemId: problem._id,
    problemVersion: problem.version || 1,
    code,
    language: cleanLang,
    status: 'pending'
  });

  try {
    await judgeQueue.add(
      'judge-job',
      { submissionId: submission._id.toString() },
      { removeOnComplete: 200, removeOnFail: 200 }
    );
  } catch (queueErr) {
    // If queue is temporarily offline (e.g. unit test environment), log and continue
    console.warn('Queue dispatch warning:', queueErr.message);
  }

  return {
    id: submission._id,
    submissionId: submission._id,
    status: submission.status,
    pollAfterMs: 1000
  };
}

async function getSubmissionById(id, requestingUser) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Submission not found.');
  }

  const sub = await Submission.findById(id).populate('problemId', 'title slug difficulty');
  if (!sub) {
    throw new NotFoundError('Submission not found.');
  }

  const isOwner = sub.userId.toString() === requestingUser.id;
  const isAdmin = requestingUser.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('You are not authorized to view this submission.');
  }

  return {
    id: sub._id,
    submissionId: sub._id,
    status: sub.status,
    isTerminal: isTerminalVerdict(sub.status),
    problemId: sub.problemId,
    problemVersion: sub.problemVersion,
    language: sub.language,
    code: sub.code,
    results: sub.results || [],
    output: sub.output,
    error: sub.error,
    time: sub.time,
    memory: sub.memory,
    createdAt: sub.createdAt
  };
}

async function getUserSubmissions(userId, { cursor, problemId, language, status, limit = 20 }) {
  const pageLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const filter = { userId };

  if (problemId && mongoose.Types.ObjectId.isValid(problemId)) {
    filter.problemId = problemId;
  }

  if (language && language.toLowerCase() !== 'all') {
    filter.language = language.toLowerCase();
  }

  if (status && status.toLowerCase() !== 'all') {
    filter.status = status.toLowerCase();
  }

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const total = await Submission.countDocuments({ userId });
  const submissions = await Submission.find(filter)
    .populate('problemId', 'title slug difficulty topic')
    .sort({ _id: -1 })
    .limit(pageLimit + 1);

  const hasNext = submissions.length > pageLimit;
  const items = hasNext ? submissions.slice(0, pageLimit) : submissions;
  const nextCursor = hasNext && items.length > 0 ? items[items.length - 1]._id.toString() : null;

  return {
    items,
    nextCursor,
    total
  };
}

module.exports = {
  createSubmission,
  getSubmissionById,
  getUserSubmissions
};
