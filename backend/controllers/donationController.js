const Donation = require('../models/Donation');
const Transaction = require('../models/Transaction');
const Logistics = require('../models/Logistics');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../services/emailService');
const performanceService = require('../services/performanceService');

// Food safety validation
const validateFoodSafety = (food_items) => {
  const now = new Date();
  const errors = [];
  
  food_items.forEach((item, index) => {
    if (new Date(item.expiry_date) <= now) {
      errors.push(`Item ${index + 1}: Food has already expired`);
    }
    if (new Date(item.preparation_time) > now) {
      errors.push(`Item ${index + 1}: Preparation time cannot be in the future`);
    }
    if (!item.storage_conditions) {
      errors.push(`Item ${index + 1}: Storage conditions must be specified`);
    }
  });
  
  return errors;
};

// Calculate quality score based on freshness and safety
const calculateQualityScore = (food_items, safety_checklist) => {
  const now = new Date();
  let totalScore = 0;
  
  food_items.forEach(item => {
    const hoursUntilExpiry = (new Date(item.expiry_date) - now) / (1000 * 60 * 60);
    const freshnessScore = Math.max(0, Math.min(10, hoursUntilExpiry / 2)); // Max 10 for 20+ hours
    totalScore += freshnessScore;
  });
  
  const avgFreshnessScore = totalScore / food_items.length;
  const safetyScore = Object.values(safety_checklist).filter(Boolean).length * 2; // Max 8
  
  return Math.min(10, avgFreshnessScore + safetyScore);
};

const createDonation = async (req, res) => {
  try {
    console.log('🍽️ CREATE DONATION - Start');
    console.log('User ID:', req.user._id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      food_items,
      quantity_serves,
      photo_url,
      coordinates,
      pickup_address,
      pickup_window_start,
      pickup_window_end,
      special_instructions,
      safety_checklist = {},
      verification_photos = []
    } = req.body;

    // Validate food safety
    console.log('🔍 Validating food safety...');
    const safetyErrors = validateFoodSafety(food_items);
    if (safetyErrors.length > 0) {
      console.log('❌ Food safety validation failed:', safetyErrors);
      return res.status(400).json({ 
        message: 'Food safety validation failed', 
        errors: safetyErrors 
      });
    }

    // Calculate quality score
    const quality_score = calculateQualityScore(food_items, safety_checklist);
    console.log('📊 Quality score calculated:', quality_score);
    
    // Auto-expire buffer: expire 2 hours before actual expiry
    const earliestExpiry = Math.min(...food_items.map(item => new Date(item.expiry_date)));
    const autoExpireTime = new Date(earliestExpiry - (2 * 60 * 60 * 1000));
    console.log('⏰ Auto-expire time set:', autoExpireTime);

    const donation = new Donation({
      donor_id: req.user._id,
      food_items,
      quantity_serves,
      photo_url,
      location: {
        type: 'Point',
        coordinates: coordinates
      },
      pickup_address,
      pickup_window_start: new Date(pickup_window_start),
      pickup_window_end: new Date(pickup_window_end),
      special_instructions,
      quality_score,
      safety_checklist,
      verification_photos,
      expiresAt: Math.min(new Date(pickup_window_end), autoExpireTime)
    });

    console.log('💾 Saving donation to database...');
    await donation.save();
    console.log('✅ Donation saved with ID:', donation._id);
    
    // Create logistics entry
    console.log('🚚 Creating logistics entry...');
    const logistics = new Logistics({
      donation_id: donation._id,
      priority_score: quality_score * 10
    });
    await logistics.save();
    console.log('✅ Logistics entry created');
    
    // Update donor stats
    console.log('📈 Updating donor stats...');
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'activity_stats.donations_posted': 1 }
    });
    console.log('✅ Donor stats updated');

    // Invalidate cache and notify nearby NGOs
    console.log('🔄 Invalidating location cache...');
    await performanceService.invalidateLocationCache(coordinates[0], coordinates[1]);
    
    console.log('🔍 Finding nearby NGOs...');
    const io = req.app.get('io');
    const nearbyNGOs = await User.find({
      role: 'ngo',
      is_verified: true,
      trust_score: { $gte: 30 },
      location: {
        $near: {
          $geometry: donation.location,
          $maxDistance: 10000
        }
      }
    }).sort({ trust_score: -1 }).limit(20);

    console.log(`📢 Notifying ${nearbyNGOs.length} nearby trusted NGOs`);
    nearbyNGOs.forEach(async (ngo) => {
      io.to(`ngo-${ngo._id}`).emit('new-donation', {
        donation: donation,
        distance: 'nearby',
        quality_score: quality_score
      });
      
      try {
        await sendEmail(ngo.email, emailTemplates.newDonation(donation, ngo));
        console.log(`📧 Email sent to NGO: ${ngo.organization_name}`);
      } catch (emailError) {
        console.error('❌ Email failed for NGO:', ngo.organization_name, emailError.message);
      }
    });

    console.log('🎉 CREATE DONATION - Success');
    res.status(201).json(donation);
  } catch (error) {
    console.error('💥 CREATE DONATION - Error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

const getNearbyDonations = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000, minQuality = 0 } = req.query;
    console.log('🗺️ GET NEARBY DONATIONS - Start');
    console.log('Parameters:', { longitude, latitude, maxDistance, minQuality });
    console.log('User:', req.user.organization_name, 'Role:', req.user.role);
    
    // Use performance service for caching
    console.log('🔍 Fetching cached nearby donations...');
    const donations = await performanceService.getCachedNearbyDonations(
      longitude, latitude, maxDistance
    );
    console.log(`📊 Found ${donations.length} donations from cache/DB`);
    
    // Filter by quality if specified
    const filteredDonations = donations.filter(donation => 
      (donation.quality_score || 0) >= parseFloat(minQuality)
    );
    console.log(`✅ Filtered to ${filteredDonations.length} donations (min quality: ${minQuality})`);

    console.log('🎉 GET NEARBY DONATIONS - Success');
    res.json(filteredDonations);
  } catch (error) {
    console.error('💥 GET NEARBY DONATIONS - Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Enhanced claim with logistics and trust verification
const claimDonation = async (req, res) => {
  try {
    const { donationId } = req.params;
    const ngoId = req.user._id;
    
    // Check NGO trust score
    if (req.user.trust_score < 30) {
      return res.status(403).json({ 
        message: 'Trust score too low. Complete more successful pickups to improve your score.' 
      });
    }

    const donation = await Donation.findOneAndUpdate(
      { 
        _id: donationId, 
        status: 'available',
        expiresAt: { $gt: new Date() },
        quality_score: { $gte: 3 } // Minimum quality threshold
      },
      { 
        status: 'reserved',
        claimed_by: ngoId,
        claimed_at: new Date()
      },
      { new: true, runValidators: true }
    ).populate('donor_id', 'organization_name phone contact_person trust_score');

    if (!donation) {
      return res.status(400).json({ 
        message: 'Donation not available, expired, or quality too low' 
      });
    }

    // Update logistics
    await Logistics.findOneAndUpdate(
      { donation_id: donationId },
      {
        $push: {
          pickup_attempts: {
            ngo_id: ngoId,
            scheduled_time: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
            status: 'scheduled'
          }
        }
      }
    );
    
    // Update NGO stats
    await User.findByIdAndUpdate(ngoId, {
      $inc: { 'activity_stats.donations_claimed': 1 }
    });

    const transaction = new Transaction({
      donation_id: donationId,
      donor_id: donation.donor_id._id,
      ngo_id: ngoId,
      action: 'claimed'
    });
    await transaction.save();

    // Set auto-reassignment timeout
    setTimeout(async () => {
      const stillReserved = await Donation.findOne({ 
        _id: donationId, 
        status: 'reserved' 
      });
      
      if (stillReserved) {
        await handleFailedPickup(donationId, ngoId, 'timeout');
      }
    }, 30 * 60 * 1000); // 30 minutes

    const io = req.app.get('io');
    io.to(`donor-${donation.donor_id._id}`).emit('donation-claimed', {
      donation: donation,
      ngo: req.user.organization_name,
      ngo_trust_score: req.user.trust_score
    });

    try {
      const ngoUser = await User.findById(ngoId);
      const donorUser = donation.donor_id;
      
      await Promise.all([
        sendEmail(ngoUser.email, emailTemplates.donationClaimed(donation, ngoUser, donorUser).ngo),
        sendEmail(donorUser.email, emailTemplates.donationClaimed(donation, ngoUser, donorUser).donor)
      ]);
    } catch (emailError) {
      console.error('Claim notification emails failed:', emailError);
    }

    res.json({
      message: 'Donation claimed successfully',
      donation: donation,
      pickup_deadline: new Date(Date.now() + 30 * 60 * 1000)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markCollected = async (req, res) => {
  try {
    const { donationId } = req.params;
    const { rating, review } = req.body;
    
    const donation = await Donation.findOneAndUpdate(
      { 
        _id: donationId, 
        claimed_by: req.user._id,
        status: 'reserved'
      },
      { 
        status: 'collected',
        collected_at: new Date()
      },
      { new: true }
    ).populate('donor_id');

    if (!donation) {
      return res.status(400).json({ 
        message: 'Donation not found or not claimed by you' 
      });
    }

    // Update logistics
    await Logistics.findOneAndUpdate(
      { donation_id: donationId },
      {
        $set: {
          'pickup_attempts.$[elem].status': 'completed'
        }
      },
      {
        arrayFilters: [{ 'elem.ngo_id': req.user._id, 'elem.status': 'scheduled' }]
      }
    );
    
    // Update both users' stats and ratings
    const updates = [
      User.findByIdAndUpdate(req.user._id, {
        $inc: { 'activity_stats.successful_pickups': 1 }
      }),
      User.findByIdAndUpdate(donation.donor_id._id, {
        $inc: { 'activity_stats.successful_pickups': 1 }
      })
    ];
    
    // Add rating if provided
    if (rating && rating >= 1 && rating <= 5) {
      const donorUpdate = {
        $push: {
          'ratings.reviews': {
            reviewer_id: req.user._id,
            rating: rating,
            comment: review || '',
            created_at: new Date()
          }
        },
        $inc: { 'ratings.count': 1 }
      };
      
      updates.push(User.findByIdAndUpdate(donation.donor_id._id, donorUpdate));
      
      // Recalculate average rating
      const donor = await User.findById(donation.donor_id._id);
      const totalRating = donor.ratings.reviews.reduce((sum, r) => sum + r.rating, 0) + rating;
      const avgRating = totalRating / (donor.ratings.count + 1);
      
      updates.push(User.findByIdAndUpdate(donation.donor_id._id, {
        'ratings.average': Math.round(avgRating * 10) / 10
      }));
    }
    
    await Promise.all(updates);

    const transaction = new Transaction({
      donation_id: donationId,
      donor_id: donation.donor_id._id,
      ngo_id: req.user._id,
      action: 'collected'
    });
    await transaction.save();

    try {
      const ngoUser = req.user;
      const donorUser = donation.donor_id;
      
      await Promise.all([
        sendEmail(ngoUser.email, emailTemplates.donationCompleted(donation, ngoUser, donorUser).ngo),
        sendEmail(donorUser.email, emailTemplates.donationCompleted(donation, ngoUser, donorUser).donor)
      ]);
    } catch (emailError) {
      console.error('Completion notification emails failed:', emailError);
    }

    res.json({ 
      message: 'Donation marked as collected', 
      donation,
      rating_submitted: !!rating
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Handle failed pickups and auto-reassignment
const handleFailedPickup = async (donationId, ngoId, reason = 'timeout') => {
  try {
    // Update logistics
    await Logistics.findOneAndUpdate(
      { donation_id: donationId },
      {
        $set: {
          'pickup_attempts.$[elem].status': 'failed',
          'pickup_attempts.$[elem].failure_reason': reason
        }
      },
      {
        arrayFilters: [{ 'elem.ngo_id': ngoId, 'elem.status': 'scheduled' }]
      }
    );
    
    // Update NGO stats (penalty)
    await User.findByIdAndUpdate(ngoId, {
      $inc: { 
        'activity_stats.failed_pickups': 1,
        'trust_score': -5 // Penalty for failed pickup
      }
    });
    
    // Check if we should reassign
    const logistics = await Logistics.findOne({ donation_id: donationId });
    const failedAttempts = logistics.pickup_attempts.filter(a => a.status === 'failed').length;
    
    if (failedAttempts < logistics.auto_reassignment.max_attempts) {
      // Release donation back to available
      await Donation.findByIdAndUpdate(donationId, {
        status: 'available',
        claimed_by: null,
        claimed_at: null
      });
      
      console.log(`Donation ${donationId} reassigned after failed pickup`);
    } else {
      // Mark as expired after max attempts
      await Donation.findByIdAndUpdate(donationId, {
        status: 'expired'
      });
      
      console.log(`Donation ${donationId} expired after ${failedAttempts} failed attempts`);
    }
  } catch (error) {
    console.error('Failed pickup handling error:', error);
  }
};

// Offline sync endpoint
const syncOfflineActions = async (req, res) => {
  try {
    const { pending_actions } = req.body;
    const results = [];
    
    for (const action of pending_actions) {
      try {
        switch (action.action) {
          case 'claim_donation':
            // Process offline claim
            const claimResult = await processClaim(action.data.donationId, req.user._id);
            results.push({ action: action.action, success: true, result: claimResult });
            break;
            
          case 'mark_collected':
            // Process offline collection
            const collectResult = await processCollection(action.data.donationId, req.user._id);
            results.push({ action: action.action, success: true, result: collectResult });
            break;
            
          default:
            results.push({ action: action.action, success: false, error: 'Unknown action' });
        }
      } catch (error) {
        results.push({ action: action.action, success: false, error: error.message });
      }
    }
    
    // Update user's last sync time
    await User.findByIdAndUpdate(req.user._id, {
      'offline_mode.last_sync': new Date(),
      'offline_mode.pending_actions': []
    });
    
    res.json({ results, synced_at: new Date() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDonorHistory = async (req, res) => {
  try {
    const donations = await Donation.find({ donor_id: req.user._id })
      .populate('claimed_by', 'organization_name')
      .sort({ createdAt: -1 });
    
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNGOHistory = async (req, res) => {
  try {
    const donations = await Donation.find({ claimed_by: req.user._id })
      .populate('donor_id', 'organization_name')
      .sort({ claimed_at: -1 });
    
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDonation,
  getNearbyDonations,
  claimDonation,
  markCollected,
  getDonorHistory,
  getNGOHistory,
  handleFailedPickup,
  syncOfflineActions
};