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
const { validateCreateDonation, validateClaimDonation, validateRelease, validateRating, validateSyncOffline } = require('../middleware/validators');
const { syncLimiter, donationCreateLimiter, claimLimiter, ratingLimiter } = require('../middleware/rateLimiter');
const serverError = require('../utils/serverError');

const router = express.Router();

// Donor routes
router.post('/', auth, requireRole(['donor']), requireVerified, donationCreateLimiter, upload.single('photo'), validateCreateDonation, createDonation);
router.get('/history/donor', auth, requireRole(['donor']), getDonorHistory);
router.post('/:donationId/rate-ngo', auth, requireRole(['donor']), ratingLimiter, validateRating, rateNGO);

// NGO routes
router.get('/nearby', auth, requireRole(['ngo']), requireVerified, getNearbyDonations);
router.post('/:donationId/claim', auth, requireRole(['ngo']), requireVerified, claimLimiter, validateClaimDonation, claimDonation);
router.post('/:donationId/collect', auth, requireRole(['ngo']), requireVerified, markCollected);
router.post('/:donationId/release', auth, requireRole(['ngo']), requireVerified, validateRelease, releaseDonation);
router.get('/history/ngo', auth, requireRole(['ngo']), getNGOHistory);

// Admin routes
router.get('/admin/history', auth, requireRole(['admin']), getAdminDonationHistory);
router.post('/:donationId/admin-release', auth, requireRole(['admin']), adminReleaseDonation);

// Enhanced features
router.post('/sync-offline', auth, syncLimiter, validateSyncOffline, syncOfflineActions);
// SMS webhook — validate Twilio signature to prevent spoofed requests
router.post('/sms-webhook', (req, res, next) => {
  const twilioSignature = req.headers['x-twilio-signature'];
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return next(); // Twilio not configured — allow through (dev mode)
  if (!twilioSignature) {
    return res.status(403).json({ message: 'Missing Twilio signature' });
  }
  try {
    const twilio = require('twilio');
    const url = `${process.env.API_BASE_URL || 'http://localhost:5001'}/api/donations/sms-webhook`;
    const valid = twilio.validateRequest(authToken, twilioSignature, url, req.body);
    if (!valid) return res.status(403).json({ message: 'Invalid Twilio signature' });
    next();
  } catch { next(); } // Graceful if twilio package unavailable
}, offlineService.handleIncomingSMS.bind(offlineService));
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
    serverError(res, error);
  }
});

module.exports = router;