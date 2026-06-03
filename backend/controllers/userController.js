const User     = require('../models/User');
const Donation = require('../models/Donation');
const redis    = require('../utils/redisClient');
const { sendEmail, emailTemplates } = require('../services/emailService');
const { decryptUserFields } = require('../utils/userHelper');

const STATS_TTL = 300; // 5 minutes

const getPendingVerifications = async (req, res) => {
  try {
    console.log('getPendingVerifications called');
    const users = await User.find({ 
      is_verified: false,
      role: { $ne: 'admin' }
    }).select('-password');
    
    const decryptedUsers = users.map(user => decryptUserFields(user));
    
    console.log(`Found ${decryptedUsers.length} pending users`);
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

    // Invalidate stats cache so admin sees updated counts immediately
    await redis.del('admin:stats:v2');
    // Invalidate user cache so the user's new is_verified state is reflected
    await redis.del(`user:${userId}`);

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
    console.log('getAllActiveDonations called');
    const donations = await Donation.find({ 
      status: { $in: ['available', 'reserved'] },
      expiresAt: { $gt: new Date() }
    })
    .populate('donor_id', 'organization_name location')
    .populate('claimed_by', 'organization_name')
    .sort({ createdAt: -1 });

    console.log(`Found ${donations.length} active donations`);
    res.json(donations);
  } catch (error) {
    console.error('getAllActiveDonations error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;

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
    console.log(`Found ${decryptedUsers.length} users (page ${page}/${Math.ceil(total / limit)})`);

    res.json({
      users: decryptedUsers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
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

    // Evict from Redis so the next request re-reads the updated status
    await redis.del(`user:${userId}`);
    await redis.del('admin:stats:v2');

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

    res.json({
      user: decrypted,
      stats: {
        posted_total:    Object.values(posted).reduce((s, v) => s + v.count, 0),
        posted_collected: posted.collected?.count || 0,
        posted_kg:       Math.round((Object.values(posted).reduce((s, v) => s + (v.kg || 0), 0)) * 10) / 10,
        claimed_total:   Object.values(claimed).reduce((s, v) => s + v.count, 0),
        claimed_collected: claimed.collected?.count || 0,
        claimed_kg:      Math.round((Object.values(claimed).reduce((s, v) => s + (v.kg || 0), 0)) * 10) / 10,
        claimed_reserved: claimed.reserved?.count || 0
      }
    });
  } catch (error) {
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
  getUserDetail
};