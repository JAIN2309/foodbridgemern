const Donation = require('../models/Donation');
const User = require('../models/User');

class PerformanceService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 120000; // 2 minutes
  }

  async connect() {
    // No-op for in-memory cache
  }

  // Cache nearby donations for performance
  async getCachedNearbyDonations(longitude, latitude, maxDistance = 10000) {
    const cacheKey = `nearby:${longitude}:${latitude}:${maxDistance}`;
    
    try {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const donations = await Donation.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
            distanceField: 'distance',
            maxDistance: parseInt(maxDistance),
            query: { 
              status: 'available',
              expiresAt: { $gt: new Date() }
            },
            spherical: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'donor_id',
            foreignField: '_id',
            as: 'donor',
            pipeline: [{ $project: { organization_name: 1, phone: 1, trust_score: 1 } }]
          }
        },
        { $limit: 50 },
        { $sort: { distance: 1, createdAt: -1 } }
      ]);

      // Cache for 2 minutes
      this.cache.set(cacheKey, { data: donations, timestamp: Date.now() });
      return donations;
    } catch (error) {
      console.error('Cache error, falling back to direct query:', error);
      return this.getFallbackNearbyDonations(longitude, latitude, maxDistance);
    }
  }

  async getFallbackNearbyDonations(longitude, latitude, maxDistance) {
    return await Donation.find({
      status: 'available',
      expiresAt: { $gt: new Date() },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: parseInt(maxDistance)
        }
      }
    })
    .populate('donor_id', 'organization_name phone trust_score')
    .limit(50)
    .sort({ createdAt: -1 });
  }

  // Batch update trust scores
  async updateTrustScores() {
    const users = await User.find({ role: { $in: ['donor', 'ngo'] } });
    
    const bulkOps = users.map(user => {
      const successRate = user.activity_stats?.successful_pickups / 
        (user.activity_stats?.successful_pickups + user.activity_stats?.failed_pickups) || 0;
      
      const ratingScore = user.ratings?.average || 0;
      const activityBonus = Math.min(user.activity_stats?.donations_posted + user.activity_stats?.donations_claimed || 0, 50);
      
      const newTrustScore = Math.min(100, (successRate * 40) + (ratingScore * 10) + activityBonus);
      
      return {
        updateOne: {
          filter: { _id: user._id },
          update: { trust_score: Math.round(newTrustScore) }
        }
      };
    });

    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps);
    }
  }

  // Clear cache when donations are updated
  async invalidateLocationCache(longitude, latitude) {
    const pattern = `nearby:${longitude}:${latitude}`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = new PerformanceService();