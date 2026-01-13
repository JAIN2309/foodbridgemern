const User = require('../models/User');
const Donation = require('../models/Donation');

class OfflineService {
  constructor() {
    // Initialize without Twilio for now
    this.smsEnabled = false;
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilio = require('twilio');
        this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        this.smsNumber = process.env.TWILIO_PHONE_NUMBER;
        this.smsEnabled = true;
      } catch (error) {
        console.log('Twilio not configured, SMS features disabled');
      }
    }
  }

  // SMS-based donation posting for offline users
  async processSMSDonation(from, message) {
    try {
      // Parse SMS format: "DONATE [food_type] [quantity] [address] [pickup_time]"
      const parts = message.toUpperCase().split(' ');
      
      if (parts[0] !== 'DONATE' || parts.length < 5) {
        await this.sendSMS(from, 'Invalid format. Use: DONATE [food_type] [quantity] [address] [pickup_time]');
        return;
      }

      const user = await User.findOne({ phone: from });
      if (!user || !user.is_verified) {
        await this.sendSMS(from, 'User not found or not verified. Please register online first.');
        return;
      }

      // Create basic donation entry
      const donation = new Donation({
        donor_id: user._id,
        food_items: [{
          name: parts[1],
          category: 'mixed',
          description: 'Posted via SMS',
          expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
          preparation_time: new Date(),
          storage_conditions: 'room_temperature'
        }],
        quantity_serves: parseInt(parts[2]) || 1,
        photo_url: 'default_sms_image.jpg',
        location: user.location, // Use user's registered location
        pickup_address: parts.slice(3, -1).join(' '),
        pickup_window_start: new Date(),
        pickup_window_end: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours window
        special_instructions: 'Posted via SMS - call donor for details',
        quality_score: 5, // Default medium quality
        safety_checklist: {
          proper_storage: false,
          within_expiry: true,
          hygienic_preparation: false,
          temperature_maintained: false
        }
      });

      await donation.save();
      
      await this.sendSMS(from, `Donation posted successfully! ID: ${donation._id.toString().slice(-6)}. NGOs will be notified.`);
      
      // Notify nearby NGOs via SMS
      await this.notifyNearbyNGOsBySMS(donation);
      
    } catch (error) {
      console.error('SMS donation processing error:', error);
      await this.sendSMS(from, 'Error processing donation. Please try again or use the app.');
    }
  }

  // SMS-based claiming for offline NGOs
  async processSMSClaim(from, message) {
    try {
      // Parse SMS format: "CLAIM [donation_id]"
      const parts = message.toUpperCase().split(' ');
      
      if (parts[0] !== 'CLAIM' || parts.length !== 2) {
        await this.sendSMS(from, 'Invalid format. Use: CLAIM [donation_id]');
        return;
      }

      const user = await User.findOne({ phone: from });
      if (!user || user.role !== 'ngo' || !user.is_verified) {
        await this.sendSMS(from, 'NGO user not found or not verified.');
        return;
      }

      // Find donation by partial ID
      const donationId = parts[1];
      const donation = await Donation.findOne({
        _id: { $regex: donationId + '$' },
        status: 'available'
      }).populate('donor_id');

      if (!donation) {
        await this.sendSMS(from, 'Donation not found or already claimed.');
        return;
      }

      // Claim the donation
      donation.status = 'reserved';
      donation.claimed_by = user._id;
      donation.claimed_at = new Date();
      await donation.save();

      await this.sendSMS(from, `Donation claimed! Pickup: ${donation.pickup_address}. Contact: ${donation.donor_id.phone}`);
      await this.sendSMS(donation.donor_id.phone, `Your donation has been claimed by ${user.organization_name}. Contact: ${user.phone}`);
      
    } catch (error) {
      console.error('SMS claim processing error:', error);
      await this.sendSMS(from, 'Error processing claim. Please try again.');
    }
  }

  async notifyNearbyNGOsBySMS(donation) {
    try {
      const nearbyNGOs = await User.find({
        role: 'ngo',
        is_verified: true,
        'offline_mode.enabled': true,
        location: {
          $near: {
            $geometry: donation.location,
            $maxDistance: 5000 // 5km for SMS notifications
          }
        }
      }).limit(5); // Limit SMS notifications

      for (const ngo of nearbyNGOs) {
        const message = `New donation available! Food: ${donation.food_items[0].name}, Serves: ${donation.quantity_serves}, Location: ${donation.pickup_address}. Reply "CLAIM ${donation._id.toString().slice(-6)}" to claim.`;
        await this.sendSMS(ngo.phone, message);
      }
    } catch (error) {
      console.error('SMS notification error:', error);
    }
  }

  async sendSMS(to, message) {
    if (!this.smsEnabled) {
      console.log(`SMS not configured. Would send to ${to}: ${message}`);
      return;
    }
    
    try {
      await this.twilioClient.messages.create({
        body: message,
        from: this.smsNumber,
        to: to
      });
    } catch (error) {
      console.error('SMS sending error:', error);
    }
  }

  // Handle incoming SMS webhook
  async handleIncomingSMS(req, res) {
    try {
      const { From, Body } = req.body;
      const message = Body.trim();
      
      if (message.toUpperCase().startsWith('DONATE')) {
        await this.processSMSDonation(From, message);
      } else if (message.toUpperCase().startsWith('CLAIM')) {
        await this.processSMSClaim(From, message);
      } else if (message.toUpperCase() === 'HELP') {
        await this.sendSMS(From, 'Commands: DONATE [food] [quantity] [address] [time] or CLAIM [donation_id]');
      } else {
        await this.sendSMS(From, 'Unknown command. Reply HELP for instructions.');
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('SMS webhook error:', error);
      res.status(500).send('Error');
    }
  }

  // Generate offline data package for sync
  async generateOfflinePackage(userId, location) {
    try {
      const nearbyDonations = await Donation.find({
        status: 'available',
        expiresAt: { $gt: new Date() },
        location: {
          $near: {
            $geometry: location,
            $maxDistance: 10000
          }
        }
      })
      .populate('donor_id', 'organization_name phone')
      .limit(20)
      .lean();

      return {
        donations: nearbyDonations,
        user_stats: await User.findById(userId).select('activity_stats trust_score ratings'),
        sync_timestamp: new Date(),
        offline_actions: []
      };
    } catch (error) {
      console.error('Offline package generation error:', error);
      return null;
    }
  }
}

module.exports = new OfflineService();