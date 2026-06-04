const express = require('express');
const { register, login, getProfile, logout, updateProfile, verifyPassword, requestPasswordReset, verifyOTP, resetPassword } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { loginLimiter, registerLimiter, passwordResetLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin, validateUpdateProfile, validatePasswordReset } = require('../middleware/validators');

const router = express.Router();

router.post('/register',               registerLimiter,      validateRegister,      register);
router.post('/login',                  loginLimiter,         validateLogin,         login);
router.post('/verify-password',        loginLimiter,         validateLogin,         verifyPassword);
router.post('/request-password-reset', passwordResetLimiter, validatePasswordReset, requestPasswordReset);
router.post('/verify-otp',             otpLimiter,           validatePasswordReset, verifyOTP);
router.post('/reset-password',         passwordResetLimiter, validatePasswordReset, resetPassword);
router.get('/profile',  auth, getProfile);
router.put('/profile',  auth, validateUpdateProfile, updateProfile);
router.post('/logout',  auth, logout);
router.put('/push-token', auth, async (req, res) => {
  try {
    const { push_token } = req.body;
    if (!push_token || typeof push_token !== 'string' || push_token.length < 10 || push_token.length > 300) {
      return res.status(400).json({ message: 'Invalid push token format' });
    }
    const userId = req.user._id || req.user.id;
    await (require('../models/User')).findByIdAndUpdate(userId, { push_token });
    await (require('../utils/redisClient')).del(`user:${userId}`);
    res.json({ message: 'Push token saved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;