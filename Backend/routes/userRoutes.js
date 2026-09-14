const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

// User Stats / Leaderboard
router.get('/user/stats', userController.getStats);

// Auth Routes (kept on /api for backward compatibility)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Profile Management
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.put('/profile/picture', auth, userController.updatePicture);

module.exports = router;
