const User = require('../models/User');
const Donation = require('../models/Donation');
const { sendEmail, emailTemplates } = require('../services/emailService');

const getPendingVerifications = async (req, res) => {
  try {
    console.log('getPendingVerifications called');
    const users = await User.find({ 
      is_verified: false,
      role: { $ne: 'admin' }
    }).select('-password');
    
    console.log(`Found ${users.length} pending users`);
    res.json(users);
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

    // Send approval/rejection email
    try {
      await sendEmail(user.email, emailTemplates.approval(user, approved));
    } catch (emailError) {
      console.error('Approval email failed:', emailError);
    }

    res.json({ 
      message: `User ${approved ? 'approved' : 'rejected'} successfully`,
      user 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminStats = async (req, res) => {
  try {
    console.log('getAdminStats called');
    const totalDonations = await Donation.countDocuments();
    const activeDonations = await Donation.countDocuments({ status: 'available' });
    const completedDonations = await Donation.countDocuments({ status: 'collected' });
    
    const totalServed = await Donation.aggregate([
      { $match: { status: 'collected' } },
      { $group: { _id: null, total: { $sum: '$quantity_serves' } } }
    ]);

    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const verifiedUsers = await User.countDocuments({ 
      is_verified: true, 
      role: { $ne: 'admin' } 
    });

    const stats = {
      donations: {
        total: totalDonations,
        active: activeDonations,
        completed: completedDonations
      },
      meals_served: totalServed[0]?.total || 0,
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        pending: totalUsers - verifiedUsers
      }
    };

    console.log('Stats:', stats);
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
    console.log('getAllUsers called');
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('-password')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${users.length} users:`, users.map(u => ({ id: u._id, org: u.organization_name, role: u.role })));
    res.json(users);
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
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { biometric_enabled: enabled },
      { new: true }
    ).select('-password');

    res.json({ 
      message: `Biometric ${enabled ? 'enabled' : 'disabled'} successfully`,
      biometric_enabled: user.biometric_enabled
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBiometricStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('biometric_enabled');
    res.json({ biometric_enabled: user.biometric_enabled });
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
  getBiometricStatus
};