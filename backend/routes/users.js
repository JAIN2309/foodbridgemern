const express = require('express');
const {
  getPendingVerifications,
  verifyUser,
  getAdminStats,
  getAllActiveDonations,
  getAllUsers,
  getHealthCheck,
  toggleBiometric,
  getBiometricStatus,
  uploadProfilePicture,
  getProfilePicture,
  deleteProfilePicture,
  toggleUserStatus,
  getUserDetail,
  getExportAnalytics
} = require('../controllers/userController');
const { auth, requireRole } = require('../middleware/auth');
const { validateAdminUserAction } = require('../middleware/validators');

const router = express.Router();

// Public routes
router.get('/health', getHealthCheck);

// Biometric routes (must come before /:userId routes)
router.put('/biometric/toggle', auth, toggleBiometric);
router.get('/biometric/status', auth, getBiometricStatus);

// Profile picture routes
router.post('/profile-picture', auth, uploadProfilePicture);
router.get('/profile-picture', auth, getProfilePicture);
router.delete('/profile-picture', auth, deleteProfilePicture);

// Admin routes
router.get('/pending', auth, requireRole(['admin']), getPendingVerifications);
router.put('/:userId/verify', auth, requireRole(['admin']), validateAdminUserAction, verifyUser);
router.put('/:userId/status', auth, requireRole(['admin']), validateAdminUserAction, toggleUserStatus);
router.get('/:userId/detail', auth, requireRole(['admin']), getUserDetail);
router.get('/stats', auth, requireRole(['admin']), getAdminStats);
router.get('/export/analytics', auth, requireRole(['admin']), getExportAnalytics);
router.get('/donations/all', auth, requireRole(['admin']), getAllActiveDonations);
router.get('/all', auth, requireRole(['admin']), getAllUsers);

module.exports = router;