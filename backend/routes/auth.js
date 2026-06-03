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