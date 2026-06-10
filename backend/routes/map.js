const express = require('express');
const router = express.Router();
const mapService = require('../services/mapService');
const { auth } = require('../middleware/auth');
const { mapLimiter } = require('../middleware/rateLimiter');
const serverError = require('../utils/serverError');

// Find nearby locations — auth required, rate limited
router.post('/nearby', auth, mapLimiter, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, type } = req.body;

    if (!mapService.validateCoordinates(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Use Mongoose models instead of raw db.collection (security + type safety)
    const Donation = require('../models/Donation');
    const User = require('../models/User');

    let locations = [];
    if (type === 'donations') {
      locations = await Donation.find({ status: 'available' })
        .select('location pickup_address food_items quantity_serves quality_score')
        .lean();
    } else if (type === 'ngos') {
      locations = await User.find({ role: 'ngo', is_verified: true })
        .select('organization_name location trust_score')
        .lean();
    }

    const nearbyLocations = mapService.findNearbyLocations(latitude, longitude, locations, radius);
    res.json({ locations: nearbyLocations });
  } catch (error) {
    serverError(res, error);
  }
});

// Calculate distance between two points — auth required
router.post('/distance', auth, mapLimiter, (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.body;

    if (!mapService.validateCoordinates(lat1, lon1) ||
        !mapService.validateCoordinates(lat2, lon2)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const distance = mapService.calculateDistance(lat1, lon1, lat2, lon2);
    res.json({ distance });
  } catch (error) {
    serverError(res, error);
  }
});

module.exports = router;
