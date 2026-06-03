const Donation = require('../models/Donation');
const Transaction = require('../models/Transaction');
const Logistics = require('../models/Logistics');
const User = require('../models/User');
const redis = require('../utils/redisClient');
const { sendEmail, emailTemplates } = require('../services/emailService');
const performanceService = require('../services/performanceService');
const { pushToUser, silentSyncToUser } = require('../services/pushService');

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
    
    let {
      food_items,
      quantity_serves,
      weight_kg,
      coordinates,
      pickup_address,
      pickup_window_start,
      pickup_window_end,
      special_instructions,
      safety_checklist = {},
      verification_photos = []
    } = req.body;

    // Parse JSON strings from FormData
    if (typeof food_items === 'string') {
      food_items = JSON.parse(food_items);
    }
    if (typeof coordinates === 'string') {
      coordinates = JSON.parse(coordinates);
    }
    if (typeof safety_checklist === 'string') {
      safety_checklist = JSON.parse(safety_checklist);
    }
    if (typeof verification_photos === 'string') {
      verification_photos = JSON.parse(verification_photos);
    }

    // Handle uploaded photo
    let photo_url = 'https://via.placeholder.com/400x300';
    if (req.file) {
      // Convert buffer to base64 data URL
      const base64Image = req.file.buffer.toString('base64');
      photo_url = `data:${req.file.mimetype};base64,${base64Image}`;
      console.log('📸 Photo uploaded, size:', req.file.size, 'bytes');
    }

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
      weight_kg: parseFloat(weight_kg) || 0,
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

// Enhanced claim with logistics, trust verification, and pickup scheduling
const claimDonation = async (req, res) => {
  try {
    const { donationId } = req.params;
    const { pickup_type = 'instant', scheduled_pickup_time } = req.body;
    const ngoId = req.user._id;

    if (req.user.trust_score < 30) {
      return res.status(403).json({
        message: 'Trust score too low. Complete more successful pickups to improve your score.'
      });
    }

    if (!['instant', 'scheduled'].includes(pickup_type)) {
      return res.status(400).json({ message: 'pickup_type must be instant or scheduled' });
    }

    const now = new Date();
    let parsedScheduledTime = null;
    let pickupDeadline;

    if (pickup_type === 'scheduled') {
      if (!scheduled_pickup_time) {
        return res.status(400).json({ message: 'scheduled_pickup_time is required for scheduled pickup' });
      }
      parsedScheduledTime = new Date(scheduled_pickup_time);
      if (isNaN(parsedScheduledTime.getTime())) {
        return res.status(400).json({ message: 'Invalid scheduled_pickup_time' });
      }
      if (parsedScheduledTime <= now) {
        return res.status(400).json({ message: 'Scheduled pickup time must be in the future' });
      }
      pickupDeadline = new Date(parsedScheduledTime.getTime() + 15 * 60 * 1000); // +15 min grace
    } else {
      pickupDeadline = new Date(now.getTime() + 30 * 60 * 1000); // instant: 30 min
    }

    const claimQuery = {
      _id: donationId,
      status: 'available',
      expiresAt: { $gt: now },
      quality_score: { $not: { $lt: 3 } } // allows null/missing quality_score
    };
    // Scheduled: validate time is within the donation's pickup window
    if (pickup_type === 'scheduled' && parsedScheduledTime) {
      claimQuery.pickup_window_end = { $gte: parsedScheduledTime };
    }

    const donation = await Donation.findOneAndUpdate(
      claimQuery,
      {
        status: 'reserved',
        claimed_by: ngoId,
        claimed_at: now,
        pickup_type,
        scheduled_pickup_time: parsedScheduledTime,
        pickup_deadline: pickupDeadline
      },
      { new: true, runValidators: true }
    ).populate('donor_id', 'organization_name phone contact_person trust_score');

    if (!donation) {
      return res.status(400).json({
        message: pickup_type === 'scheduled'
          ? 'Donation not available, already expired, or your scheduled time exceeds the pickup window'
          : 'Donation not available, expired, or quality too low'
      });
    }

    // Update logistics
    await Logistics.findOneAndUpdate(
      { donation_id: donationId },
      {
        $push: {
          pickup_attempts: {
            ngo_id: ngoId,
            scheduled_time: parsedScheduledTime || pickupDeadline,
            status: 'scheduled'
          }
        }
      }
    );

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

    // Auto-revert at the pickup deadline
    const timeoutMs = pickupDeadline.getTime() - now.getTime();
    setTimeout(async () => {
      const stillReserved = await Donation.findOne({ _id: donationId, status: 'reserved' });
      if (stillReserved) {
        await handleFailedPickup(donationId, ngoId, 'timeout');
      }
    }, timeoutMs);

    if (donation.location?.coordinates) {
      const [lng, lat] = donation.location.coordinates;
      await performanceService.invalidateLocationCache(lng, lat);
    }

    const io = req.app.get('io');
    io.to(`donor-${donation.donor_id._id}`).emit('donation-claimed', {
      donation,
      ngo: req.user.organization_name,
      ngo_trust_score: req.user.trust_score,
      pickup_type,
      pickup_deadline: pickupDeadline
    });

    pushToUser(donation.donor_id._id, {
      title: '🤝 Your donation was claimed!',
      body: `${req.user.organization_name} will pick up "${donation.food_items.map(i => i.name).join(', ')}"${
        pickup_type === 'scheduled'
          ? ` on ${parsedScheduledTime.toLocaleString()}`
          : ' within 30 minutes'
      }`,
      data: { type: 'donation_claimed', donationId: donation._id.toString() }
    }).catch(() => {});

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
      donation,
      pickup_type,
      pickup_deadline: pickupDeadline,
      scheduled_pickup_time: parsedScheduledTime
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

    // Push to donor — instant notification even if app is closed
    pushToUser(donation.donor_id._id, {
      title: '✅ Your food made an impact!',
      body: `${donation.food_items.map(i => i.name).join(', ')} was collected${donation.weight_kg ? ` — ${donation.weight_kg}kg saved from waste` : ''}`,
      data: { type: 'donation_collected', donationId: donation._id.toString() }
    }).catch(() => {});

    // Invalidate cache + clear admin stats cache so counts update
    if (donation.location?.coordinates) {
      const [lng, lat] = donation.location.coordinates;
      await performanceService.invalidateLocationCache(lng, lat);
    }
    await redis.del('admin:stats');

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

// NGO releases a claimed donation back to available
const releaseDonation = async (req, res) => {
  try {
    const { donationId } = req.params;
    const { reason } = req.body;
    const ngoId = req.user._id;

    const donation = await Donation.findOne({
      _id: donationId,
      claimed_by: ngoId,
      status: 'reserved'
    });

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found or not claimed by you' });
    }

    await Donation.findByIdAndUpdate(donationId, {
      status: 'available',
      claimed_by: null,
      claimed_at: null,
      $push: {
        release_history: {
          ngo_id: ngoId,
          reason: reason || 'No reason provided',
          released_at: new Date()
        }
      }
    });

    // Log as failed pickup (voluntary release)
    await User.findByIdAndUpdate(ngoId, {
      $inc: { 'activity_stats.failed_pickups': 1 }
    });

    // Invalidate nearby cache so other NGOs see it immediately
    if (donation.location?.coordinates) {
      const [lng, lat] = donation.location.coordinates;
      await performanceService.invalidateLocationCache(lng, lat);
    }
    await redis.del('admin:stats');

    res.json({ message: 'Donation released back to available' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin force-releases any reserved donation back to available
const adminReleaseDonation = async (req, res) => {
  try {
    const { donationId } = req.params;

    const donation = await Donation.findOneAndUpdate(
      { _id: donationId, status: 'reserved' },
      { status: 'available', claimed_by: null, claimed_at: null },
      { new: true }
    );

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found or not in reserved state' });
    }

    if (donation.location?.coordinates) {
      const [lng, lat] = donation.location.coordinates;
      await performanceService.invalidateLocationCache(lng, lat);
    }
    await redis.del('admin:stats');

    res.json({ message: 'Donation force-released to available', donation });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
          case 'claim_donation': {
            const donation = await Donation.findOneAndUpdate(
              { _id: action.data.donationId, status: 'available', expiresAt: { $gt: new Date() }, quality_score: { $not: { $lt: 3 } } },
              { status: 'reserved', claimed_by: req.user._id, claimed_at: new Date() },
              { new: true }
            );
            if (!donation) throw new Error('Donation no longer available');
            await User.findByIdAndUpdate(req.user._id, { $inc: { 'activity_stats.donations_claimed': 1 } });
            await performanceService.invalidateLocationCache(donation.location?.coordinates?.[0], donation.location?.coordinates?.[1]);
            results.push({ action: action.action, success: true, donationId: action.data.donationId });
            break;
          }

          case 'mark_collected': {
            const donation = await Donation.findOneAndUpdate(
              { _id: action.data.donationId, claimed_by: req.user._id, status: 'reserved' },
              { status: 'collected', collected_at: new Date() },
              { new: true }
            );
            if (!donation) throw new Error('Donation not found or already collected');
            await Promise.all([
              User.findByIdAndUpdate(req.user._id, { $inc: { 'activity_stats.successful_pickups': 1 } }),
              User.findByIdAndUpdate(donation.donor_id, { $inc: { 'activity_stats.successful_pickups': 1 } })
            ]);
            await redis.del('admin:stats');
            results.push({ action: action.action, success: true, donationId: action.data.donationId });
            break;
          }

          case 'release_donation': {
            const donation = await Donation.findOneAndUpdate(
              { _id: action.data.donationId, claimed_by: req.user._id, status: 'reserved' },
              { status: 'available', claimed_by: null, claimed_at: null,
                $push: { release_history: { ngo_id: req.user._id, reason: action.data.reason || 'Offline release', released_at: new Date() } }
              },
              { new: true }
            );
            if (!donation) throw new Error('Donation not found');
            await performanceService.invalidateLocationCache(donation.location?.coordinates?.[0], donation.location?.coordinates?.[1]);
            results.push({ action: action.action, success: true, donationId: action.data.donationId });
            break;
          }

          default:
            results.push({ action: action.action, success: false, error: 'Unknown action' });
        }
      } catch (error) {
        results.push({ action: action.action, success: false, error: error.message });
      }
    }

    await User.findByIdAndUpdate(req.user._id, {
      'offline_mode.last_sync': new Date(),
      'offline_mode.pending_actions': []
    });

    // Silent push to the user to refresh their data after sync
    silentSyncToUser(req.user._id, { synced: results.length }).catch(() => {});

    res.json({ results, synced_at: new Date() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDonorHistory = async (req, res) => {
  try {
    const donations = await Donation.find({ donor_id: req.user._id })
      .populate('claimed_by', 'organization_name email phone contact_person address trust_score ratings activity_stats')
      .sort({ createdAt: -1 });
    
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNGOHistory = async (req, res) => {
  try {
    // Get ALL claimed donations including expired/completed ones
    const donations = await Donation.find({ 
      claimed_by: req.user._id,
      deletion_scheduled: { $ne: true }
    })
      .populate('donor_id', 'organization_name phone contact_person trust_score address')
      .sort({ claimed_at: -1 });
    
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get complete donation history with full audit trail
const getAdminDonationHistory = async (req, res) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      donorId, 
      ngoId,
      page = 1,
      limit = 50 
    } = req.query;
    
    // Build query
    const query = { deletion_scheduled: { $ne: true } };
    
    if (status) query.status = status;
    if (donorId) query.donor_id = donorId;
    if (ngoId) query.claimed_by = ngoId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Get total count
    const total = await Donation.countDocuments(query);
    
    // Get paginated donations with full details
    const donations = await Donation.find(query)
      .populate('donor_id', 'organization_name email phone contact_person trust_score')
      .populate('claimed_by', 'organization_name email phone contact_person trust_score')
      .populate('status_history.changed_by', 'organization_name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Calculate statistics
    const stats = await Donation.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalServes: { $sum: '$quantity_serves' }
        }
      }
    ]);
    
    res.json({
      donations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      statistics: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalServes: stat.totalServes
        };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Admin donation history error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Background job: expire available donations + revert overdue reserved ones
const markExpiredDonations = async () => {
  try {
    const now = new Date();

    // 1. Available donations past pickup window → expired
    const expiredDonations = await Donation.find({
      status: 'available',
      expiresAt: { $lte: now },
      deletion_scheduled: { $ne: true }
    });

    for (const donation of expiredDonations) {
      donation.status = 'expired';
      donation.status_history.push({
        status: 'expired',
        changed_at: now,
        reason: 'Automatic expiry - pickup window ended'
      });
      await donation.save();
    }

    // 2. Reserved donations past their pickup_deadline → revert to available
    const overdueReserved = await Donation.find({
      status: 'reserved',
      pickup_deadline: { $lte: now, $ne: null },
      deletion_scheduled: { $ne: true }
    });

    for (const donation of overdueReserved) {
      await handleFailedPickup(donation._id, donation.claimed_by, 'deadline_exceeded');
    }

    const total = expiredDonations.length + overdueReserved.length;
    console.log(`✅ Expiry job: ${expiredDonations.length} expired, ${overdueReserved.length} overdue reserved reverted`);
    return total;
  } catch (error) {
    console.error('❌ Error marking expired donations:', error);
    return 0;
  }
};

// Optional: Clean up very old donations (e.g., after 90 days)
const cleanupOldDonations = async (daysOld = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Only mark for deletion, don't actually delete
    const result = await Donation.updateMany(
      {
        createdAt: { $lte: cutoffDate },
        deletion_scheduled: { $ne: true }
      },
      {
        $set: {
          deletion_scheduled: true,
          deleted_at: new Date()
        }
      }
    );
    
    console.log(`🗑️ Marked ${result.modifiedCount} old donations for cleanup`);
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Error cleaning up old donations:', error);
    return 0;
  }
};

module.exports = {
  createDonation,
  getNearbyDonations,
  claimDonation,
  markCollected,
  releaseDonation,
  adminReleaseDonation,
  getDonorHistory,
  getNGOHistory,
  getAdminDonationHistory,
  handleFailedPickup,
  syncOfflineActions,
  markExpiredDonations,
  cleanupOldDonations
};