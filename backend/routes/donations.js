const express = require('express');
const {
  createDonation,
  getNearbyDonations,
  claimDonation,
  markCollected,
  getDonorHistory,
  getNGOHistory,
  syncOfflineActions
} = require('../controllers/donationController');
const { auth, requireRole, requireVerified } = require('../middleware/auth');
const offlineService = require('../services/offlineService');

const router = express.Router();

// Donor routes
router.post('/', auth, requireRole(['donor']), requireVerified, createDonation);
router.get('/history/donor', auth, requireRole(['donor']), getDonorHistory);

// NGO routes
router.get('/nearby', auth, requireRole(['ngo']), requireVerified, getNearbyDonations);
router.post('/:donationId/claim', auth, requireRole(['ngo']), requireVerified, claimDonation);
router.post('/:donationId/collect', auth, requireRole(['ngo']), requireVerified, markCollected);
router.get('/history/ngo', auth, requireRole(['ngo']), getNGOHistory);

// Enhanced features
router.post('/sync-offline', auth, syncOfflineActions);
router.post('/sms-webhook', offlineService.handleIncomingSMS.bind(offlineService));
router.get('/offline-package', auth, async (req, res) => {
  try {
    const { longitude, latitude } = req.query;
    const location = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)]
    };
    
    const package = await offlineService.generateOfflinePackage(req.user._id, location);
    res.json(package);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;