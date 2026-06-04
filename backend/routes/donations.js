const express = require('express');
const {
  createDonation,
  getNearbyDonations,
  claimDonation,
  markCollected,
  releaseDonation,
  adminReleaseDonation,
  rateNGO,
  getDonorHistory,
  getNGOHistory,
  getAdminDonationHistory,
  syncOfflineActions
} = require('../controllers/donationController');
const { auth, requireRole, requireVerified } = require('../middleware/auth');
const upload = require('../middleware/upload');
const offlineService = require('../services/offlineService');
const { validateCreateDonation, validateClaimDonation } = require('../middleware/validators');
const { syncLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Donor routes
router.post('/', auth, requireRole(['donor']), requireVerified, upload.single('photo'), validateCreateDonation, createDonation);
router.get('/history/donor', auth, requireRole(['donor']), getDonorHistory);
router.post('/:donationId/rate-ngo', auth, requireRole(['donor']), rateNGO);

// NGO routes
router.get('/nearby', auth, requireRole(['ngo']), requireVerified, getNearbyDonations);
router.post('/:donationId/claim', auth, requireRole(['ngo']), requireVerified, validateClaimDonation, claimDonation);
router.post('/:donationId/collect', auth, requireRole(['ngo']), requireVerified, markCollected);
router.post('/:donationId/release', auth, requireRole(['ngo']), requireVerified, releaseDonation);
router.get('/history/ngo', auth, requireRole(['ngo']), getNGOHistory);

// Admin routes
router.get('/admin/history', auth, requireRole(['admin']), getAdminDonationHistory);
router.post('/:donationId/admin-release', auth, requireRole(['admin']), adminReleaseDonation);

// Enhanced features
router.post('/sync-offline', auth, syncLimiter, syncOfflineActions);
router.post('/sms-webhook', offlineService.handleIncomingSMS.bind(offlineService));
router.get('/offline-package', auth, async (req, res) => {
  try {
    const redis = require('../utils/redisClient');
    const cacheKey = `offline:pkg:${req.user._id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const { longitude, latitude } = req.query;
    const location = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)]
    };

    const pkg = await offlineService.generateOfflinePackage(req.user._id, location);
    await redis.set(cacheKey, JSON.stringify(pkg), 300); // 5 min TTL
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;