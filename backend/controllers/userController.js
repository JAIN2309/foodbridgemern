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
    await redis.del('admin:stats');
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
    const cached = await redis.get('admin:stats');
    if (cached) {
      console.log('⚡ Admin stats served from Redis cache');
      return res.json(JSON.parse(cached));
    }

    const [
      donationByStatus,
      totalServed,
      totalUsers,
      verifiedUsers,
      donorCount,
      ngoCount,
      servesPending,
      kgSaved
    ] = await Promise.all([
      Donation.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Donation.aggregate([
        { $match: { status: 'collected' } },
        { $group: { _id: null, total: { $sum: '$quantity_serves' } } }
      ]),
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ is_verified: true, role: { $ne: 'admin' } }),
      User.countDocuments({ role: 'donor' }),
      User.countDocuments({ role: 'ngo' }),
      Donation.aggregate([
        { $match: { status: { $in: ['available', 'reserved'] } } },
        { $group: { _id: null, total: { $sum: '$quantity_serves' } } }
      ]),
      Donation.aggregate([
        { $match: { status: 'collected' } },
        { $group: { _id: null, total: { $sum: '$weight_kg' } } }
      ])
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
      }
    };

    await redis.set('admin:stats', JSON.stringify(stats), STATS_TTL);
    res.json(stats);
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
  deleteProfilePicture
};