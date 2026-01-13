const User = require('../models/User');
const Donation = require('../models/Donation');

class TrustService {
  constructor() {
    // Initialize cron job only if node-cron is available
    try {
      const cron = require('node-cron');
      // Run trust score updates every hour
      cron.schedule('0 * * * *', () => {
        this.updateAllTrustScores();
      });
    } catch (error) {
      console.log('Cron jobs not available, trust scores will need manual updates');
    }
  }

  async calculateTrustScore(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return 0;

      const stats = user.activity_stats;
      const ratings = user.ratings;

      // Base score factors
      let score = 50; // Starting score

      // Success rate (40% weight)
      const totalAttempts = stats.successful_pickups + stats.failed_pickups;
      if (totalAttempts > 0) {
        const successRate = stats.successful_pickups / totalAttempts;
        score += (successRate * 40);
      }

      // Rating score (20% weight)
      if (ratings.count > 0) {
        score += (ratings.average * 4); // Max 20 points for 5-star rating
      }

      // Activity bonus (20% weight)
      const totalActivity = stats.donations_posted + stats.donations_claimed;
      const activityBonus = Math.min(20, totalActivity * 0.5);
      score += activityBonus;

      // Response time bonus (10% weight)
      if (stats.response_time_avg > 0) {
        const responseBonus = Math.max(0, 10 - (stats.response_time_avg / 60)); // Penalty for slow response
        score += responseBonus;
      }

      // Verification bonus (10% weight)
      if (user.is_verified) {
        score += 10;
      }

      // Penalties
      if (stats.failed_pickups > 5) {
        score -= (stats.failed_pickups - 5) * 2; // Penalty for multiple failures
      }

      return Math.max(0, Math.min(100, Math.round(score)));
    } catch (error) {
      console.error('Trust score calculation error:', error);
      return 50; // Default score on error
    }
  }

  async updateAllTrustScores() {
    try {
      console.log('Starting trust score update...');
      
      const users = await User.find({ 
        role: { $in: ['donor', 'ngo'] },
        is_verified: true 
      });

      const bulkOps = [];
      
      for (const user of users) {
        const newScore = await this.calculateTrustScore(user._id);
        
        bulkOps.push({
          updateOne: {
            filter: { _id: user._id },
            update: { trust_score: newScore }
          }
        });
      }

      if (bulkOps.length > 0) {
        await User.bulkWrite(bulkOps);
        console.log(`Updated trust scores for ${bulkOps.length} users`);
      }
    } catch (error) {
      console.error('Bulk trust score update error:', error);
    }
  }

  async flagSuspiciousActivity(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const recentDonations = await Donation.find({
        $or: [
          { donor_id: userId },
          { claimed_by: userId }
        ],
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      // Flag if too many donations in 24 hours
      if (recentDonations.length > 10) {
        console.log(`Suspicious activity detected for user ${userId}: ${recentDonations.length} donations in 24h`);
        
        // Reduce trust score
        await User.findByIdAndUpdate(userId, {
          $inc: { trust_score: -10 }
        });
      }

      // Flag if multiple failed pickups
      const failedPickups = await Donation.countDocuments({
        claimed_by: userId,
        status: 'expired',
        claimed_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      if (failedPickups > 3) {
        console.log(`Multiple failed pickups detected for user ${userId}: ${failedPickups} in 7 days`);
        
        await User.findByIdAndUpdate(userId, {
          $inc: { trust_score: -15 }
        });
      }
    } catch (error) {
      console.error('Suspicious activity flagging error:', error);
    }
  }

  async getRecommendedNGOs(donationLocation, limit = 10) {
    try {
      return await User.find({
        role: 'ngo',
        is_verified: true,
        trust_score: { $gte: 40 },
        location: {
          $near: {
            $geometry: donationLocation,
            $maxDistance: 15000 // 15km
          }
        }
      })
      .sort({ 
        trust_score: -1, 
        'activity_stats.successful_pickups': -1 
      })
      .limit(limit)
      .select('organization_name trust_score activity_stats ratings location');
    } catch (error) {
      console.error('NGO recommendation error:', error);
      return [];
    }
  }
}

module.exports = new TrustService();