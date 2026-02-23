const cron = require('node-cron');
const Donation = require('../models/Donation');

// Auto-expire donations based on expiry_date
const autoExpireDonations = async () => {
  try {
    console.log('🕐 Running auto-expire donations job...');
    
    const now = new Date();
    
    // Find donations that should be expired
    const expiredDonations = await Donation.updateMany(
      {
        status: { $in: ['available', 'reserved'] },
        $or: [
          { expiresAt: { $lte: now } },
          { 'food_items.expiry_date': { $lte: now } }
        ]
      },
      {
        $set: {
          status: 'expired',
          expired_at: now,
          expired_reason: 'auto_expired'
        }
      }
    );

    if (expiredDonations.modifiedCount > 0) {
      console.log(`✅ Auto-expired ${expiredDonations.modifiedCount} donations`);
    }

    return expiredDonations.modifiedCount;
  } catch (error) {
    console.error('❌ Auto-expire donations error:', error);
    return 0;
  }
};

// Start cron jobs
const startCronJobs = () => {
  console.log('🚀 Starting cron jobs...');
  
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', autoExpireDonations);
  
  console.log('✅ Cron jobs started successfully');
};

module.exports = {
  startCronJobs,
  autoExpireDonations
};