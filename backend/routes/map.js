const express = require('express');
const router = express.Router();
const mapService = require('../services/mapService');

// Find nearby donations/NGOs
router.post('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, type } = req.body;

    if (!mapService.validateCoordinates(latitude, longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Get locations based on type (donations, ngos, etc.)
    let locations = [];
    if (type === 'donations') {
      // Fetch from donations collection
      locations = await req.db.collection('donations').find({
        status: 'available',
        latitude: { $exists: true },
        longitude: { $exists: true }
      }).toArray();
    } else if (type === 'ngos') {
      // Fetch from NGOs collection
      locations = await req.db.collection('users').find({
        role: 'ngo',
        latitude: { $exists: true },
        longitude: { $exists: true }
      }).toArray();
    }

    const nearbyLocations = mapService.findNearbyLocations(
      latitude, 
      longitude, 
      locations, 
      radius
    );

    res.json({ locations: nearbyLocations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate distance between two points
router.post('/distance', (req, res) => {
  try {
    const { lat1, lon1, lat2, lon2 } = req.body;

    if (!mapService.validateCoordinates(lat1, lon1) || 
        !mapService.validateCoordinates(lat2, lon2)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const distance = mapService.calculateDistance(lat1, lon1, lat2, lon2);
    res.json({ distance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;