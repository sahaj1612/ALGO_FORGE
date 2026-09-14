const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');

async function getProblems({ cursor, topic, difficulty, q, limit = 20 }, userId = null) {
  const pageLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const filter = { status: 'published' };

  if (topic && topic.toLowerCase() !== 'all') {
    filter.topic = new RegExp(`^${topic.trim()}$`, 'i');
  }

  if (difficulty && difficulty.toLowerCase() !== 'all') {
    filter.difficulty = difficulty.trim();
  }

  if (q && q.trim()) {
    const searchRegex = new RegExp(q.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { slug: searchRegex },
      { topic: searchRegex }
    ];
  }

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $gt: new mongoose.Types.ObjectId(cursor) };
  }

  const total = await Problem.countDocuments({ status: 'published' });
  const problems = await Problem.find(filter)
    .select('slug title difficulty topic status constraints')
    .sort({ _id: 1 })
    .limit(pageLimit + 1);

  const hasNext = problems.length > pageLimit;
  const items = hasNext ? problems.slice(0, pageLimit) : problems;
  const nextCursor = hasNext && items.length > 0 ? items[items.length - 1]._id.toString() : null;

  let solvedProblemIds = new Set();
  if (userId) {
    const acceptedSubs = await Submission.find({
      userId,
      status: 'accepted'
    }).select('problemId');
    solvedProblemIds = new Set(acceptedSubs.map(s => s.problemId.toString()));
  }

  const formattedItems = items.map(p => ({
    _id: p._id,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    topic: p.topic,
    status: p.status,
    isSolved: solvedProblemIds.has(p._id.toString())
  }));

  return {
    items: formattedItems,
    nextCursor,
    total
  };
}

async function getProblemBySlugOrId(slugOrId) {
  if (!slugOrId?.trim()) {
    throw new NotFoundError('Problem not found.');
  }

  const clean = slugOrId.trim();
  let query = { status: 'published' };

  if (mongoose.Types.ObjectId.isValid(clean)) {
    query.$or = [{ slug: clean.toLowerCase() }, { _id: clean }];
  } else {
    query.slug = clean.toLowerCase();
  }

  const problem = await Problem.findOne(query).select('-hiddenTestcases');
  if (!problem) {
    throw new NotFoundError('Problem not found or not published.');
  }

  return problem;
}

async function getAllProblemsAdmin() {
  return Problem.find().sort({ updatedAt: -1 });
}

async function createProblemAdmin(data) {
  const { slug, title, description, difficulty } = data;
  if (!slug?.trim() || !title?.trim() || !description?.trim() || !difficulty) {
    throw new BadRequestError('Slug, title, description, and difficulty are required.');
  }

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (await Problem.exists({ slug: cleanSlug })) {
    throw new ConflictError(`Problem with slug '${cleanSlug}' already exists.`);
  }

  return Problem.create({
    ...data,
    slug: cleanSlug,
    title: title.trim(),
    version: 1
  });
}

async function updateProblemAdmin(id, updates) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Problem not found.');
  }

  const cleanUpdates = { ...updates };
  delete cleanUpdates._id;
  delete cleanUpdates.version;

  if (cleanUpdates.slug) {
    cleanUpdates.slug = cleanUpdates.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const existing = await Problem.findOne({ slug: cleanUpdates.slug, _id: { $ne: id } });
    if (existing) {
      throw new ConflictError(`Slug '${cleanUpdates.slug}' is already taken.`);
    }
  }

  const problem = await Problem.findByIdAndUpdate(
    id,
    {
      ...cleanUpdates,
      $inc: { version: 1 }
    },
    { new: true, runValidators: true }
  );

  if (!problem) {
    throw new NotFoundError('Problem not found.');
  }

  return problem;
}

async function retireProblemAdmin(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Problem not found.');
  }

  const problem = await Problem.findByIdAndUpdate(id, { status: 'retired' }, { new: true });
  if (!problem) {
    throw new NotFoundError('Problem not found.');
  }

  return problem;
}

module.exports = {
  getProblems,
  getProblemBySlugOrId,
  getAllProblemsAdmin,
  createProblemAdmin,
  updateProblemAdmin,
  retireProblemAdmin
};
