const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const learningController = require('../controllers/learningController');

// 1. BOOKMARKS
router.get('/bookmarks', auth, learningController.getBookmarks);
router.post('/bookmarks/:problemId', auth, learningController.toggleBookmark);

// 2. NOTES
router.get('/notes/:problemId', auth, learningController.getNote);
router.put('/notes/:problemId', auth, learningController.saveNote);

// 3. RECENTLY VIEWED
router.post('/viewed/:problemId', auth, learningController.recordView);
router.get('/viewed', auth, learningController.getRecentlyViewed);

module.exports = router;
