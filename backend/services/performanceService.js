const Donation = require('../models/Donation');
const User     = require('../models/User');
const redis    = require('../utils/redisClient');

const NEARBY_TTL = 120; // 2 minutes

class PerformanceService {
  async getCachedNearbyDonations(longitude, latitude, maxDistance = 10000) {
    const cacheKey = `nearby:${longitude}:${latitude}:${maxDistance}`;

    try {
      // Try Redis first
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log('⚡ Nearby donations served from Redis cache');
        return JSON.parse(cached);
      }

      const donations = await Donation.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
            distanceField: 'distance',
            maxDistance: parseInt(maxDistance),
            query: { status: 'available', expiresAt: { $gt: new Date() } },
            spherical: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'donor_id',
            foreignField: '_id',
            as: 'donor_id',
            pipeline: [{ $project: { organization_name: 1, phone: 1, trust_score: 1, address: 1 } }]
          }
        },
        { $unwind: { path: '$donor_id', preserveNullAndEmptyArrays: true } },
        { $limit: 50 },
        { $sort: { distance: 1, createdAt: -1 } }
      ]);

      await redis.set(cacheKey, JSON.stringify(donations), NEARBY_TTL);
      return donations;
    } catch (error) {
      console.error('Cache error, falling back to direct query:', error);
      return this.getFallbackNearbyDonations(longitude, latitude, maxDistance);
    }
  }

  async getFallbackNearbyDonations(longitude, latitude, maxDistance) {
    return Donation.find({
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

  async invalidateLocationCache(longitude, latitude) {
    // Delete all radius variants for this coordinate
    const pattern = `nearby:${longitude}:${latitude}`;
    // Redis doesn't support glob scan in a safe way here — delete known keys
    const keys = [5000, 10000, 20000].map(d => `${pattern}:${d}`);
    for (const key of keys) await redis.del(key);
    console.log('🗑️ Invalidated nearby cache for', longitude, latitude);
  }

  async updateTrustScores() {
    const users = await User.find({ role: { $in: ['donor', 'ngo'] } });
    const bulkOps = users.map(user => {
      const { successful_pickups = 0, failed_pickups = 0, donations_posted = 0, donations_claimed = 0 } = user.activity_stats || {};
      const successRate = (successful_pickups + failed_pickups) > 0
        ? successful_pickups / (successful_pickups + failed_pickups)
        : 0;
      const ratingScore  = user.ratings?.average || 0;
      const activityBonus = Math.min(donations_posted + donations_claimed, 50);
      const newScore = Math.min(100, Math.round((successRate * 40) + (ratingScore * 10) + activityBonus));
      return { updateOne: { filter: { _id: user._id }, update: { trust_score: newScore } } };
    });
    if (bulkOps.length > 0) await User.bulkWrite(bulkOps);
  }
}

module.exports = new PerformanceService();
