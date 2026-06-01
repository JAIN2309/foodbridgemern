const express = require('express');
const { register, login, getProfile, logout, updateProfile, verifyPassword, requestPasswordReset, verifyOTP, resetPassword } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/verify-password', verifyPassword);
router.post('/request-password-reset', passwordResetLimiter, requestPasswordReset);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.post('/logout', auth, logout);

module.exports = router;