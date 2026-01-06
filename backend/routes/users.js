const express = require('express');
const {
  getPendingVerifications,
  verifyUser,
  getAdminStats,
  getAllActiveDonations,
  getAllUsers,
  getHealthCheck
} = require('../controllers/userController');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Admin routes
router.get('/health', getHealthCheck); // Public health check
router.get('/pending', auth, requireRole(['admin']), getPendingVerifications);
router.put('/:userId/verify', auth, requireRole(['admin']), verifyUser);
router.get('/stats', auth, requireRole(['admin']), getAdminStats);
router.get('/donations/all', auth, requireRole(['admin']), getAllActiveDonations);
router.get('/all', auth, requireRole(['admin']), getAllUsers);

module.exports = router;