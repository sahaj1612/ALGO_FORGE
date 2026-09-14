const mongoose = require('mongoose');
const User = require('../models/User');
const { BadRequestError, NotFoundError } = require('../utils/errors');

async function getBookmarks(userId) {
  const user = await User.findById(userId).populate('bookmarks', 'title slug difficulty topic');
  return user?.bookmarks || [];
}

async function toggleBookmark(userId, problemId) {
  if (!mongoose.Types.ObjectId.isValid(problemId)) {
    throw new BadRequestError('Invalid problemId');
  }

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found.');

  const idStr = problemId.toString();
  const index = user.bookmarks.findIndex(id => id.toString() === idStr);
  let bookmarked = false;

  if (index === -1) {
    user.bookmarks.push(problemId);
    bookmarked = true;
  } else {
    user.bookmarks.splice(index, 1);
    bookmarked = false;
  }

  await user.save();
  return { bookmarked, bookmarks: user.bookmarks };
}

async function getNote(userId, problemId) {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found.');

  const note = user.notes.find(n => n.problemId.toString() === problemId.toString());
  return {
    content: note ? note.content : '',
    updatedAt: note ? note.updatedAt : null
  };
}

async function saveNote(userId, problemId, content = '') {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found.');

  const existingIndex = user.notes.findIndex(n => n.problemId.toString() === problemId.toString());
  if (existingIndex !== -1) {
    user.notes[existingIndex].content = content;
    user.notes[existingIndex].updatedAt = new Date();
  } else {
    user.notes.push({ problemId, content, updatedAt: new Date() });
  }

  await user.save();
  return { message: 'Note saved successfully.', content };
}

async function recordView(userId, problemId) {
  if (!mongoose.Types.ObjectId.isValid(problemId)) {
    throw new BadRequestError('Invalid problemId');
  }

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found.');

  user.recentlyViewed = user.recentlyViewed.filter(v => v.problemId.toString() !== problemId.toString());
  user.recentlyViewed.unshift({ problemId, viewedAt: new Date() });

  if (user.recentlyViewed.length > 20) {
    user.recentlyViewed = user.recentlyViewed.slice(0, 20);
  }

  await user.save();
  return { ok: true };
}

async function getRecentlyViewed(userId) {
  const user = await User.findById(userId).populate('recentlyViewed.problemId', 'title slug difficulty topic');
  return user?.recentlyViewed || [];
}

module.exports = {
  getBookmarks,
  toggleBookmark,
  getNote,
  saveNote,
  recordView,
  getRecentlyViewed
};
