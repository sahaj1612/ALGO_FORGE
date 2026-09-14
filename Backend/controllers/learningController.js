const learningService = require('../services/learningService');

async function getBookmarks(req, res, next) {
  try {
    const bookmarks = await learningService.getBookmarks(req.user.id);
    res.json(bookmarks);
  } catch (error) {
    next(error);
  }
}

async function toggleBookmark(req, res, next) {
  try {
    const result = await learningService.toggleBookmark(req.user.id, req.params.problemId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getNote(req, res, next) {
  try {
    const note = await learningService.getNote(req.user.id, req.params.problemId);
    res.json(note);
  } catch (error) {
    next(error);
  }
}

async function saveNote(req, res, next) {
  try {
    const result = await learningService.saveNote(req.user.id, req.params.problemId, req.body.content);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function recordView(req, res, next) {
  try {
    const result = await learningService.recordView(req.user.id, req.params.problemId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getRecentlyViewed(req, res, next) {
  try {
    const viewed = await learningService.getRecentlyViewed(req.user.id);
    res.json(viewed);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBookmarks,
  toggleBookmark,
  getNote,
  saveNote,
  recordView,
  getRecentlyViewed
};
