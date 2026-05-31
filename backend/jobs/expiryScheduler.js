const { markExpiredDonations, cleanupOldDonations } = require('../controllers/donationController');

class ExpiryScheduler {
  constructor() {
    this.expiryInterval = null;
    this.cleanupInterval = null;
  }

  start() {
    console.log('🚀 Starting Expiry Scheduler...');
    
    // Mark expired donations every 5 minutes
    this.expiryInterval = setInterval(async () => {
      console.log('⏰ Running expiry check...');
      const count = await markExpiredDonations();
      if (count > 0) {
        console.log(`✅ Marked ${count} donations as expired`);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Clean up old donations once per day (at 2 AM)
    this.scheduleCleanup();
    
    // Run initial check immediately
    markExpiredDonations();
    
    console.log('✅ Expiry Scheduler started successfully');
  }

  scheduleCleanup() {
    const now = new Date();
    const next2AM = new Date(now);
    next2AM.setHours(2, 0, 0, 0);
    
    // If 2 AM has passed today, schedule for tomorrow
    if (next2AM <= now) {
      next2AM.setDate(next2AM.getDate() + 1);
    }
    
    const timeUntil2AM = next2AM - now;
    
    setTimeout(() => {
      // Run cleanup
      cleanupOldDonations(90); // Clean up donations older than 90 days
      
      // Schedule daily cleanup
      this.cleanupInterval = setInterval(() => {
        cleanupOldDonations(90);
      }, 24 * 60 * 60 * 1000); // Once per day
    }, timeUntil2AM);
    
    console.log(`🗑️ Cleanup scheduled for ${next2AM.toLocaleString()}`);
  }

  stop() {
    if (this.expiryInterval) {
      clearInterval(this.expiryInterval);
      this.expiryInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('🛑 Expiry Scheduler stopped');
  }
}

module.exports = new ExpiryScheduler();
