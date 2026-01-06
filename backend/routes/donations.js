const express = require('express');
const {
  createDonation,
  getNearbyDonations,
  claimDonation,
  markCollected,
  getDonorHistory,
  getNGOHistory
} = require('../controllers/donationController');
const { auth, requireRole, requireVerified } = require('../middleware/auth');

const router = express.Router();

// Donor routes
router.post('/', auth, requireRole(['donor']), requireVerified, createDonation);
router.get('/history/donor', auth, requireRole(['donor']), getDonorHistory);

// NGO routes
router.get('/nearby', auth, requireRole(['ngo']), requireVerified, getNearbyDonations);
router.post('/:donationId/claim', auth, requireRole(['ngo']), requireVerified, claimDonation);
router.post('/:donationId/collect', auth, requireRole(['ngo']), requireVerified, markCollected);
router.get('/history/ngo', auth, requireRole(['ngo']), getNGOHistory);

module.exports = router;