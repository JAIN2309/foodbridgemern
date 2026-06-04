const express = require('express');
const { register, login, getProfile, logout, updateProfile, verifyPassword, requestPasswordReset, verifyOTP, resetPassword } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin, validateUpdateProfile, validatePasswordReset } = require('../middleware/validators');

const router = express.Router();

router.post('/register',               registerLimiter,      validateRegister,      register);
router.post('/login',                  loginLimiter,         validateLogin,         login);
router.post('/verify-password',                              validateLogin,         verifyPassword);
router.post('/request-password-reset', passwordResetLimiter, validatePasswordReset, requestPasswordReset);
router.post('/verify-otp',                                   validatePasswordReset, verifyOTP);
router.post('/reset-password',         passwordResetLimiter, validatePasswordReset, resetPassword);
router.get('/profile',  auth, getProfile);
router.put('/profile',  auth, validateUpdateProfile, updateProfile);
router.post('/logout',  auth, logout);
router.put('/push-token', auth, async (req, res) => {
  try {
    const { push_token } = req.body;
    const userId = req.user._id || req.user.id;
    await (require('../models/User')).findByIdAndUpdate(userId, { push_token });
    await (require('../utils/redisClient')).del(`user:${userId}`);
    res.json({ message: 'Push token saved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;