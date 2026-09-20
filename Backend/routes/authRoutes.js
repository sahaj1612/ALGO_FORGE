const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validator');
const { authLoginLimiter, authRegisterLimiter } = require('../middleware/rateLimiter');

router.post('/register', authRegisterLimiter, validateRegister, authController.register);
router.post('/login', authLoginLimiter, validateLogin, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

module.exports = router;
