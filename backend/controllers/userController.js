const User     = require('../models/User');
const Donation = require('../models/Donation');
const redis    = require('../utils/redisClient');
const { sendEmail, emailTemplates } = require('../services/emailService');
const { decryptUserFields } = require('../utils/userHelper');

const STATS_TTL = 300; // 5 minutes

const getPendingVerifications = async (req, res) => {
  try {
    const cached = await redis.get('admin:pending');
    if (cached) return res.json(JSON.parse(cached));

    const users = await User.find({ is_verified: false, role: { $ne: 'admin' } }).select('-password');
    const decryptedUsers = users.map(user => decryptUserFields(user));
    await redis.set('admin:pending', JSON.stringify(decryptedUsers), 60); // 1 min TTL
    res.json(decryptedUsers);
  } catch (error) {
    console.error('getPendingVerifications error:', error);
    res.status(500).json({ message: error.message });
  }
};

const verifyUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { approved } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { is_verified: approved },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const decryptedUser = decryptUserFields(user);

    // Send approval/rejection email
    try {
      await sendEmail(decryptedUser.email, emailTemplates.approval(decryptedUser, approved));
    } catch (emailError) {
      console.error('Approval email failed:', emailError);
    }

    await redis.del('admin:stats:v2');
    await redis.del('admin:pending');
    await redis.del(`user:${userId}`);
    await redis.del(`admin:user_detail:${userId}`);
    const userListKeys = await redis.getClient()?.keys('admin:users:*') || [];
    if (userListKeys.length) await redis.getClient().del(userListKeys);

    res.json({
      message: `User ${approved ? 'approved' : 'rejected'} successfully`,
      user: decryptedUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const hasDateRange = !!(startDate || endDate);

    // Only use cache for all-time (no date filter)
    if (!hasDateRange) {
      const cached = await redis.get('admin:stats:v2');
      if (cached) {
        console.log('⚡ Admin stats served from Redis cache');
        return res.json(JSON.parse(cached));
      }
    }

    const now = new Date();

    // Build date range filter for donations
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    const donationDateMatch = hasDateRange ? { createdAt: dateFilter } : {};
    const claimDateMatch    = hasDateRange ? { claimed_at: dateFilter } : {};

    const [
      donationByStatus,
      totalServed,
      totalUsers,
      verifiedUsers,
      donorCount,
      ngoCount,
      servesPending,
      kgSaved,
      pickupTypeBreakdown,
      upcomingScheduled,
      instantReserved
    ] = await Promise.all([
      Donation.aggregate([{ $match: donationDateMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Donation.aggregate([
        { $match: { status: 'collected', ...donationDateMatch } },
        { $group: { _id: null, total: { $sum: '$quantity_serves' } } }
      ]),
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ is_verified: true, role: { $ne: 'admin' } }),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'ngo' }),
      Donation.aggregate([
        { $match: { status: { $in: ['available', 'reserved'] }, ...donationDateMatch } },
        { $group: { _id: null, total: { $sum: '$quantity_serves' } } }
      ]),
      Donation.aggregate([
        { $match: { status: 'collected', ...donationDateMatch } },
        { $group: { _id: null, total: { $sum: '$weight_kg' } } }
      ]),
      // Pickup type breakdown — filter by claimed_at range
      Donation.aggregate([
        { $match: { status: { $in: ['reserved', 'collected'] }, pickup_type: { $exists: true }, ...claimDateMatch } },
        { $group: { _id: '$pickup_type', count: { $sum: 1 } } }
      ]),
      // Real-time counts — never date-filtered
      Donation.countDocuments({ status: 'reserved', pickup_type: 'scheduled', scheduled_pickup_time: { $gt: now } }),
      Donation.countDocuments({ status: 'reserved', pickup_type: 'instant', pickup_deadline: { $gt: now } })
    ]);

    const byStatus = donationByStatus.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {});

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const completed = byStatus.collected || 0;
    const active    = byStatus.available || 0;
    const reserved  = byStatus.reserved  || 0;
    const expired   = byStatus.expired   || 0;

    const ptMap = pickupTypeBreakdown.reduce((acc, p) => { acc[p._id] = p.count; return acc; }, {});
    const instantTotal   = ptMap.instant   || 0;
    const scheduledTotal = ptMap.scheduled || 0;
    const pickupTotal    = instantTotal + scheduledTotal;

    const stats = {
      donations: {
        total,
        active,
        reserved,
        completed,
        expired,
        completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0
      },
      meals_served:  totalServed[0]?.total  || 0,
      meals_pending: servesPending[0]?.total || 0,
      kg_saved: Math.round((kgSaved[0]?.total || 0) * 10) / 10,
      users: {
        total:             totalUsers,
        verified:          verifiedUsers,
        pending:           totalUsers - verifiedUsers,
        donors:            donorCount,
        ngos:              ngoCount,
        verification_rate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0
      },
      pickup: {
        instant:            instantTotal,
        scheduled:          scheduledTotal,
        total:              pickupTotal,
        instant_pct:        pickupTotal > 0 ? Math.round((instantTotal   / pickupTotal) * 100) : 0,
        scheduled_pct:      pickupTotal > 0 ? Math.round((scheduledTotal / pickupTotal) * 100) : 0,
        upcoming_scheduled: upcomingScheduled,
        instant_active:     instantReserved
      }
    };

    const response = {
      ...stats,
      date_range: hasDateRange ? { start: startDate || null, end: endDate || null } : null
    };

    if (!hasDateRange) {
      await redis.set('admin:stats:v2', JSON.stringify(response), STATS_TTL);
    }
    res.json(response);
  } catch (error) {
    console.error('getAdminStats error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAllActiveDonations = async (req, res) => {
  try {
    const cached = await redis.get('admin:active_donations');
    if (cached) return res.json(JSON.parse(cached));
    const donations = await Donation.find({ 
      status: { $in: ['available', 'reserved'] },
      expiresAt: { $gt: new Date() }
    })
    .populate('donor_id', 'organization_name location')
    .populate('claimed_by', 'organization_name')
    .sort({ createdAt: -1 });

    await redis.set('admin:active_donations', JSON.stringify(donations), 60); // 1 min TTL
    res.json(donations);
  } catch (error) {
    console.error('getAllActiveDonations error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { role = 'all', search = '', page = 1, limit = 10 } = req.query;
    // Skip cache for search queries (too many combinations) — only cache browsing
    const cacheKey = search ? null : `admin:users:p${page}:r${role}`;
    if (cacheKey) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    const filter = {};
    if (role && role !== 'all') filter.role = role;
    if (search) {
      filter.$or = [
        { organization_name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const decryptedUsers = users.map(user => decryptUserFields(user));
    const payload = {
      users: decryptedUsers,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    };

    if (cacheKey) await redis.set(cacheKey, JSON.stringify(payload), 60); // 60s TTL
    res.json(payload);
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getHealthCheck = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const nonAdminUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    
    res.json({
      status: 'OK',
      database: 'Connected',
      users: {
        total: totalUsers,
        admin: adminUsers,
        nonAdmin: nonAdminUsers
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR',
      database: 'Disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

const toggleBiometric = async (req, res) => {
  try {
    const { enabled } = req.body;
    const userId = req.user._id || req.user.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { biometric_enabled: enabled },
      { new: true }
    ).select('-password');

    const decryptedUser = decryptUserFields(user);

    res.json({ 
      message: `Biometric ${enabled ? 'enabled' : 'disabled'} successfully`,
      biometric_enabled: decryptedUser.biometric_enabled
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBiometricStatus = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('biometric_enabled');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ biometric_enabled: user.biometric_enabled });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    const { image } = req.body; // Base64 encoded image
    
    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Encrypt the image data using simple base64 encoding (already encrypted from client)
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profile_picture: image },
      { new: true }
    ).select('-password');

    res.json({ 
      message: 'Profile picture uploaded successfully',
      profile_picture: user.profile_picture
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('profile_picture');
    console.log('📸 Raw profile_picture from DB:', user.profile_picture ? user.profile_picture.substring(0, 100) : 'null');
    const decryptedUser = decryptUserFields(user);
    console.log('📸 Decrypted profile_picture:', decryptedUser.profile_picture ? decryptedUser.profile_picture.substring(0, 100) : 'null');
    res.json({ profile_picture: decryptedUser.profile_picture });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteProfilePicture = async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user.id,
      { profile_picture: null },
      { new: true }
    );

    res.json({ message: 'Profile picture deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ message: 'is_active must be a boolean' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { is_active },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    await redis.del(`user:${userId}`);
    await redis.del(`admin:user_detail:${userId}`);
    await redis.del('admin:stats:v2');
    const uKeys = await redis.getClient()?.keys('admin:users:*') || [];
    if (uKeys.length) await redis.getClient().del(uKeys);

    // Notify the user by email
    try {
      const { decryptUserFields } = require('../utils/userHelper');
      const decrypted = decryptUserFields(user);
      await require('../services/emailService').sendEmail(
        decrypted.email,
        {
          subject: is_active ? 'FoodBridge — Account Activated' : 'FoodBridge — Account Deactivated',
          html: is_active
            ? `<p>Hi ${user.contact_person},</p><p>Your FoodBridge account has been <strong>activated</strong> by the admin. You can now log in.</p>`
            : `<p>Hi ${user.contact_person},</p><p>Your FoodBridge account has been <strong>deactivated</strong> by the admin. Please contact support if you believe this is a mistake.</p>`
        }
      );
    } catch {}

    res.json({ message: `User ${is_active ? 'activated' : 'deactivated'} successfully`, is_active });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    const cacheKey = `admin:user_detail:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const Donation = require('../models/Donation');

    const [user, donationStats] = await Promise.all([
      User.findById(userId).select('-password'),
      Donation.aggregate([
        {
          $facet: {
            posted:    [{ $match: { donor_id:   require('mongoose').Types.ObjectId.createFromHexString(userId) } }, { $group: { _id: '$status', count: { $sum: 1 }, kg: { $sum: '$weight_kg' }, serves: { $sum: '$quantity_serves' } } }],
            claimed:   [{ $match: { claimed_by: require('mongoose').Types.ObjectId.createFromHexString(userId) } }, { $group: { _id: '$status', count: { $sum: 1 }, kg: { $sum: '$weight_kg' }, serves: { $sum: '$quantity_serves' } } }]
          }
        }
      ])
    ]);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const { decryptUserFields } = require('../utils/userHelper');
    const decrypted = decryptUserFields(user);

    const posted  = (donationStats[0]?.posted  || []).reduce((a, s) => { a[s._id] = s; return a; }, {});
    const claimed = (donationStats[0]?.claimed || []).reduce((a, s) => { a[s._id] = s; return a; }, {});

    const detail = {
      user: decrypted,
      stats: {
        posted_total:     Object.values(posted).reduce((s, v) => s + v.count, 0),
        posted_collected: posted.collected?.count || 0,
        posted_kg:        Math.round((Object.values(posted).reduce((s, v) => s + (v.kg || 0), 0)) * 10) / 10,
        claimed_total:    Object.values(claimed).reduce((s, v) => s + v.count, 0),
        claimed_collected: claimed.collected?.count || 0,
        claimed_kg:       Math.round((Object.values(claimed).reduce((s, v) => s + (v.kg || 0), 0)) * 10) / 10,
        claimed_reserved: claimed.reserved?.count || 0
      }
    };
    await redis.set(cacheKey, JSON.stringify(detail), 120); // 2 min TTL
    res.json(detail);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExportAnalytics = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    const hasRange        = !!(startDate || endDate);
    const donationMatch   = hasRange ? { createdAt: dateFilter } : {};
    const claimMatch      = hasRange ? { claimed_at: dateFilter } : {};

    // Default daily window: last 30 days when no range given
    const dailyFrom = hasRange ? (dateFilter.$gte || new Date(Date.now() - 30 * 86400000)) : new Date(Date.now() - 30 * 86400000);
    const dailyTo   = hasRange ? (dateFilter.$lte || new Date()) : new Date();

    const [
      statusBreakdown,
      totalServed,
      totalKg,
      mealsPending,
      pickupBreakdown,
      dailyBreakdown,
      categories,
      releaseReasons,
      topNGOs,
      topDonors,
      totalUsers,
      verifiedUsers,
      donorCount,
      ngoCount
    ] = await Promise.all([
      Donation.aggregate([
        { $match: donationMatch },
        { $group: { _id: '$status', count: { $sum: 1 }, kg: { $sum: '$weight_kg' }, serves: { $sum: '$quantity_serves' } } }
      ]),
      Donation.aggregate([
        { $match: { status: 'collected', ...donationMatch } },
        { $group: { _id: null, total: { $sum: '$quantity_serves' } } }
      ]),
      Donation.aggregate([
        { $match: { status: 'collected', ...donationMatch } },
        { $group: { _id: null, total: { $sum: '$weight_kg' } } }
      ]),
      Donation.aggregate([
        { $match: { status: { $in: ['available', 'reserved'] }, ...donationMatch } },
        { $group: { _id: null, total: { $sum: '$quantity_serves' } } }
      ]),
      Donation.aggregate([
        { $match: { status: { $in: ['reserved', 'collected'] }, pickup_type: { $exists: true }, ...claimMatch } },
        { $group: { _id: '$pickup_type', count: { $sum: 1 }, kg: { $sum: '$weight_kg' } } }
      ]),
      // Daily trend
      Donation.aggregate([
        { $match: { createdAt: { $gte: dailyFrom, $lte: dailyTo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total:     { $sum: 1 },
          collected: { $sum: { $cond: [{ $eq: ['$status', 'collected'] }, 1, 0] } },
          reserved:  { $sum: { $cond: [{ $eq: ['$status', 'reserved']  }, 1, 0] } },
          expired:   { $sum: { $cond: [{ $eq: ['$status', 'expired']   }, 1, 0] } },
          kg:        { $sum: '$weight_kg' },
          serves:    { $sum: '$quantity_serves' }
        }},
        { $sort: { _id: 1 } }
      ]),
      // Food categories
      Donation.aggregate([
        { $match: donationMatch },
        { $unwind: { path: '$food_items', preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: '$food_items.category',
          count:  { $sum: 1 },
          kg:     { $sum: '$weight_kg' },
          serves: { $sum: '$quantity_serves' }
        }},
        { $sort: { count: -1 } }
      ]),
      // Release reasons
      Donation.aggregate([
        { $match: donationMatch },
        { $unwind: { path: '$release_history', preserveNullAndEmptyArrays: false } },
        { $group: { _id: '$release_history.reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      // Top 10 NGOs by collections
      Donation.aggregate([
        { $match: { status: { $in: ['reserved', 'collected'] }, claimed_by: { $ne: null }, ...claimMatch } },
        { $group: {
          _id:       '$claimed_by',
          claimed:   { $sum: 1 },
          collected: { $sum: { $cond: [{ $eq: ['$status', 'collected'] }, 1, 0] } },
          kg_saved:  { $sum: { $cond: [{ $eq: ['$status', 'collected'] }, '$weight_kg', 0] } },
          serves:    { $sum: { $cond: [{ $eq: ['$status', 'collected'] }, '$quantity_serves', 0] } }
        }},
        { $sort: { collected: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
        { $unwind: '$u' },
        { $project: {
          name: '$u.organization_name',
          claimed: 1, collected: 1,
          kg_saved: { $round: ['$kg_saved', 1] },
          serves: 1,
          success_rate: { $cond: [{ $gt: ['$claimed', 0] }, { $round: [{ $multiply: [{ $divide: ['$collected', '$claimed'] }, 100] }, 0] }, 0] }
        }}
      ]),
      // Top 10 donors by donations posted
      Donation.aggregate([
        { $match: { donor_id: { $ne: null }, ...donationMatch } },
        { $group: {
          _id:      '$donor_id',
          posted:   { $sum: 1 },
          collected:{ $sum: { $cond: [{ $eq: ['$status', 'collected'] }, 1, 0] } },
          kg:       { $sum: '$weight_kg' },
          serves:   { $sum: '$quantity_serves' }
        }},
        { $sort: { posted: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
        { $unwind: '$u' },
        { $project: {
          name: '$u.organization_name',
          posted: 1, collected: 1,
          kg: { $round: ['$kg', 1] },
          serves: 1
        }}
      ]),
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ is_verified: true, role: { $ne: 'admin' } }),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'ngo' })
    ]);

    const byStatus = statusBreakdown.reduce((a, s) => { a[s._id] = s; return a; }, {});
    const total = Object.values(byStatus).reduce((s, v) => s + v.count, 0);
    const ptMap = pickupBreakdown.reduce((a, p) => { a[p._id] = p; return a; }, {});
    const instT  = ptMap.instant?.count   || 0;
    const schedT = ptMap.scheduled?.count || 0;
    const ptTot  = instT + schedT || 1;

    res.json({
      period: {
        start:       startDate || null,
        end:         endDate   || null,
        is_all_time: !hasRange,
        daily_from:  dailyFrom.toISOString().slice(0, 10),
        daily_to:    dailyTo.toISOString().slice(0, 10)
      },
      generated_at: new Date().toISOString(),
      summary: {
        donations: {
          total,
          available:       byStatus.available?.count   || 0,
          reserved:        byStatus.reserved?.count    || 0,
          collected:       byStatus.collected?.count   || 0,
          expired:         byStatus.expired?.count     || 0,
          completion_rate: total > 0 ? Math.round(((byStatus.collected?.count || 0) / total) * 100) : 0
        },
        impact: {
          meals_served:  totalServed[0]?.total || 0,
          meals_pending: mealsPending[0]?.total || 0,
          kg_saved:      Math.round((totalKg[0]?.total || 0) * 10) / 10
        },
        pickup: {
          instant:       instT,
          scheduled:     schedT,
          instant_pct:   Math.round((instT  / ptTot) * 100),
          scheduled_pct: Math.round((schedT / ptTot) * 100)
        },
        users: {
          total: totalUsers, verified: verifiedUsers,
          pending: totalUsers - verifiedUsers,
          donors: donorCount, ngos: ngoCount
        }
      },
      daily_breakdown: dailyBreakdown.map(d => ({
        date:      d._id,
        total:     d.total,
        collected: d.collected,
        reserved:  d.reserved,
        expired:   d.expired,
        kg:        Math.round((d.kg || 0) * 10) / 10,
        serves:    d.serves || 0
      })),
      food_categories: categories
        .filter(c => c._id)
        .map(c => ({ category: c._id, count: c.count, kg: Math.round((c.kg || 0) * 10) / 10, serves: c.serves || 0 })),
      release_reasons: releaseReasons.map(r => ({ reason: r._id || 'Unknown', count: r.count })),
      top_ngos: topNGOs,
      top_donors: topDonors
    });
  } catch (error) {
    console.error('getExportAnalytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getRatingsSummary = async (req, res) => {
  try {
    const cached = await redis.get('admin:ratings');
    if (cached) return res.json(JSON.parse(cached));

    const [platformStats, topNGOs, topDonors, recentReviews] = await Promise.all([

      // Overall platform rating stats
      User.aggregate([
        { $match: { 'ratings.count': { $gt: 0 } } },
        { $group: {
          _id: null,
          total_reviews:  { $sum: '$ratings.count' },
          platform_avg:   { $avg: '$ratings.average' },
          rated_users:    { $sum: 1 },
          five_star:  { $sum: { $size: { $filter: { input: '$ratings.reviews', as: 'r', cond: { $eq: ['$$r.rating', 5] } } } } },
          four_star:  { $sum: { $size: { $filter: { input: '$ratings.reviews', as: 'r', cond: { $eq: ['$$r.rating', 4] } } } } },
          three_star: { $sum: { $size: { $filter: { input: '$ratings.reviews', as: 'r', cond: { $eq: ['$$r.rating', 3] } } } } },
          two_star:   { $sum: { $size: { $filter: { input: '$ratings.reviews', as: 'r', cond: { $eq: ['$$r.rating', 2] } } } } },
          one_star:   { $sum: { $size: { $filter: { input: '$ratings.reviews', as: 'r', cond: { $eq: ['$$r.rating', 1] } } } } },
        }}
      ]),

      // Top 10 NGOs by rating
      User.find({ role: 'ngo', 'ratings.count': { $gt: 0 } })
        .select('organization_name contact_person ratings trust_score is_verified')
        .sort({ 'ratings.average': -1, 'ratings.count': -1 })
        .limit(10),

      // Top 10 Donors by rating
      User.find({ role: 'donor', 'ratings.count': { $gt: 0 } })
        .select('organization_name contact_person ratings trust_score is_verified')
        .sort({ 'ratings.average': -1, 'ratings.count': -1 })
        .limit(10),

      // Recent reviews feed — unwind all users' reviews into a flat timeline
      User.aggregate([
        { $match: { 'ratings.reviews.0': { $exists: true } } },
        { $unwind: '$ratings.reviews' },
        { $project: {
          recipient_name: '$organization_name',
          recipient_role: '$role',
          rating:    '$ratings.reviews.rating',
          comment:   '$ratings.reviews.comment',
          created_at:'$ratings.reviews.created_at',
          reviewer_id:'$ratings.reviews.reviewer_id'
        }},
        { $sort: { created_at: -1 } },
        { $limit: 30 },
        { $lookup: {
          from: 'users',
          localField: 'reviewer_id',
          foreignField: '_id',
          as: 'reviewer'
        }},
        { $unwind: { path: '$reviewer', preserveNullAndEmptyArrays: true } },
        { $project: {
          recipient_name: 1,
          recipient_role: 1,
          rating: 1,
          comment: 1,
          created_at: 1,
          reviewer_name: '$reviewer.organization_name',
          reviewer_role: '$reviewer.role'
        }}
      ])
    ]);

    const stats = platformStats[0] || { total_reviews: 0, platform_avg: 0, rated_users: 0 };

    const payload = {
      stats: {
        total_reviews: stats.total_reviews,
        platform_avg:  Math.round((stats.platform_avg || 0) * 10) / 10,
        rated_users:   stats.rated_users,
        distribution:  { 5: stats.five_star || 0, 4: stats.four_star || 0, 3: stats.three_star || 0, 2: stats.two_star || 0, 1: stats.one_star || 0 }
      },
      top_ngos:       topNGOs,
      top_donors:     topDonors,
      recent_reviews: recentReviews
    };

    await redis.set('admin:ratings', JSON.stringify(payload), 300); // 5 min TTL
    res.json(payload);
  } catch (error) {
    console.error('getRatingsSummary error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPendingVerifications,
  verifyUser,
  getAdminStats,
  getAllActiveDonations,
  getAllUsers,
  getHealthCheck,
  toggleBiometric,
  getBiometricStatus,
  uploadProfilePicture,
  getProfilePicture,
  deleteProfilePicture,
  toggleUserStatus,
  getUserDetail,
  getRatingsSummary,
  getExportAnalytics
};