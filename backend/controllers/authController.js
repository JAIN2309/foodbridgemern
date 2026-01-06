const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../services/emailService');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const register = async (req, res) => {
  try {
    const {
      email,
      password,
      role,
      organization_name,
      license_number,
      contact_person,
      phone,
      coordinates,
      address
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = new User({
      email,
      password,
      role,
      organization_name,
      license_number,
      contact_person,
      phone,
      location: {
        type: 'Point',
        coordinates: coordinates // [longitude, latitude]
      },
      address,
      is_verified: role === 'admin' // Auto-verify admin
    });

    await user.save();

    // Send registration email
    try {
      await sendEmail(user.email, emailTemplates.registration(user));
    } catch (emailError) {
      console.error('Registration email failed:', emailError);
    }

    const token = generateToken(user._id);
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        organization_name: user.organization_name,
        is_verified: user.is_verified
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    
    // Send login email
    try {
      await sendEmail(user.email, emailTemplates.login(user));
    } catch (emailError) {
      console.error('Login email failed:', emailError);
    }
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        organization_name: user.organization_name,
        is_verified: user.is_verified,
        location: user.location
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    console.log('🚪 Logout API called for user:', req.user.email);
    
    // Send logout email
    try {
      console.log('📧 Sending logout email to:', req.user.email);
      await sendEmail(req.user.email, emailTemplates.logout(req.user));
      console.log('✅ Logout email sent successfully');
    } catch (emailError) {
      console.error('❌ Logout email failed:', emailError.message);
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout API error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { contact_person, phone, email } = req.body;
    const userId = req.user._id;

    // Check if email is being changed and if it already exists
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { contact_person, phone, email },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getProfile, logout, updateProfile };