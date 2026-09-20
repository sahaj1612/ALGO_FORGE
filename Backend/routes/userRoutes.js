const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { authLoginLimiter, authRegisterLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin } = require('../middleware/validator');

// User Stats / Leaderboard
router.get('/user/stats', userController.getStats);

// Auth Routes (kept on /api for backward compatibility)
router.post('/auth/register', authRegisterLimiter, validateRegister, authController.register);
router.post('/auth/login', authLoginLimiter, validateLogin, authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authController.logout);

// Profile Management
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.put('/profile/picture', auth, userController.updatePicture);

// Data Retention & Privacy (GDPR Export & Erasure)
router.get('/user/export', auth, userController.exportAccountData);
router.get('/profile/export', auth, userController.exportAccountData);
router.delete('/user/account', auth, userController.deleteAccount);
router.delete('/profile', auth, userController.deleteAccount);

module.exports = router;
