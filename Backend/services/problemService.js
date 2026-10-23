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

async function getProblemBySlug(slug) {
  if (!slug?.trim()) {
    throw new NotFoundError('Problem not found.');
  }

  const clean = slug.trim().toLowerCase();
  const identifierQuery = mongoose.Types.ObjectId.isValid(clean)
    ? { $or: [{ slug: clean }, { _id: new mongoose.Types.ObjectId(clean) }] }
    : { slug: clean };
  const query = { status: 'published', ...identifierQuery };

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

  const problem = new Problem({
    ...data,
    slug: cleanSlug,
    title: title.trim(),
    version: 1
  });
  assertPublishableContract(problem);
  return problem.save();
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

  const problem = await Problem.findById(id);

  if (!problem) {
    throw new NotFoundError('Problem not found.');
  }

  Object.assign(problem, cleanUpdates);
  problem.version += 1;
  assertPublishableContract(problem);
  await problem.save();

  return problem;
}

function assertPublishableContract(problem) {
  if (problem.status !== 'published') return;

  const signature = problem.signature;
  if (!signature?.functionName || !signature.returnType || !Array.isArray(signature.parameters)) {
    throw new BadRequestError('Published problems require a callable signature.');
  }
  if (!problem.adapter?.kind) {
    throw new BadRequestError('Published problems require an adapter specification.');
  }
  if (!Array.isArray(problem.supportedLanguages) || problem.supportedLanguages.length === 0) {
    throw new BadRequestError('Published problems must declare at least one supported language.');
  }
  for (const language of problem.supportedLanguages) {
    if (typeof problem.starterCode?.get === 'function' ? !problem.starterCode.get(language) : !problem.starterCode?.[language]) {
      throw new BadRequestError(`Published problem is missing starter code for ${language}.`);
    }
  }
  if (!Array.isArray(problem.hiddenTestcases) || problem.hiddenTestcases.length === 0) {
    throw new BadRequestError('Published problems require at least one hidden testcase.');
  }
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

async function deleteProblemAdmin(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Problem not found.');
  }

  const problem = await Problem.findByIdAndDelete(id);
  if (!problem) {
    throw new NotFoundError('Problem not found.');
  }

  return problem;
}

module.exports = {
  getProblems,
  getProblemBySlug,
  getAllProblemsAdmin,
  createProblemAdmin,
  updateProblemAdmin,
  retireProblemAdmin,
  deleteProblemAdmin
};
