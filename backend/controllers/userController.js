const User = require('../models/User');
const Donation = require('../models/Donation');
const { sendEmail, emailTemplates } = require('../services/emailService');
const { decryptUserFields } = require('../utils/userHelper');

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
    const { role } = req.query;
    
    // Build filter query
    const filter = {};
    if (role && role !== 'all') {
      filter.role = role;
    }
    
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });
    
    console.log('Sample user before decrypt:', users[0] ? {
      email: users[0].email,
      phone: users[0].phone,
      contact_person: users[0].contact_person,
      email_encrypted: users[0].email_encrypted ? 'exists' : 'null',
      phone_encrypted: users[0].phone_encrypted ? 'exists' : 'null'
    } : 'no users');
    
    const decryptedUsers = users.map(user => decryptUserFields(user));
    
    console.log('Sample user after decrypt:', decryptedUsers[0] ? {
      email: decryptedUsers[0].email,
      phone: decryptedUsers[0].phone,
      contact_person: decryptedUsers[0].contact_person
    } : 'no users');
    
    console.log(`Found ${decryptedUsers.length} users`);
    res.json(decryptedUsers);
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
    const user = await User.findById(req.user.id).select('biometric_enabled');
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