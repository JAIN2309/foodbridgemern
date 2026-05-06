const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../services/emailService');
const { decryptUserFields } = require('../utils/userHelper');

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
    
    // Return complete user profile (excluding password)
    const userProfile = user.toObject();
    delete userProfile.password;

    res.status(201).json({
      token,
      user: userProfile
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
    
    // Return complete user profile (excluding password)
    const userProfile = user.toObject();
    delete userProfile.password;
    
    res.json({
      token,
      user: userProfile,
      biometric_enabled: user.biometric_enabled,
      profile_picture: user.profile_picture
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    console.log('👤 Raw user fields from DB:', {
      email: user.email,
      phone: user.phone,
      contact_person: user.contact_person,
      email_encrypted: user.email_encrypted ? 'exists' : 'null',
      phone_encrypted: user.phone_encrypted ? 'exists' : 'null',
      contact_person_encrypted: user.contact_person_encrypted ? 'exists' : 'null'
    });
    const decryptedUser = decryptUserFields(user);
    console.log('👤 Decrypted user fields:', {
      email: decryptedUser.email,
      phone: decryptedUser.phone,
      contact_person: decryptedUser.contact_person
    });
    res.json(decryptedUser);
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
    console.log('📝 Update Profile Request Body:', req.body);
    const { contact_person, phone, email, organization_name, address, coordinates } = req.body;
    const userId = req.user._id;

    // Check if email is being changed and if it already exists
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Only update basic profile fields, preserve stats and other data
    const updateData = {};
    if (contact_person !== undefined) updateData.contact_person = contact_person;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (organization_name !== undefined) updateData.organization_name = organization_name;
    if (address !== undefined) updateData.address = address;
    
    console.log('📝 Update Data:', updateData);
    
    // Update location if coordinates provided
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      updateData.location = {
        type: 'Point',
        coordinates: coordinates
      };
    }

    // Fetch user, update fields, and save to trigger pre-save hook
    const user = await User.findById(userId).select('-password');
    
    // Update fields
    Object.keys(updateData).forEach(key => {
      user[key] = updateData[key];
    });
    
    // Save to trigger pre-save hook for encryption
    await user.save();

    // Refetch to trigger post-init hook for decryption
    const userWithDecryption = await User.findById(userId).select('-password');
    const decryptedUser = decryptUserFields(userWithDecryption);

    console.log('✅ Updated User org name:', decryptedUser.organization_name);
    console.log('✅ Updated User phone:', decryptedUser.phone);
    console.log('✅ Preserved activity stats:', decryptedUser.activity_stats);

    res.json({
      message: 'Profile updated successfully',
      user: decryptedUser
    });
  } catch (error) {
    console.error('❌ Update Profile Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Verify password without logging in (for biometric setup)
const verifyPassword = async (req, res) => {
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

    // Password is correct
    res.json({ message: 'Password verified', valid: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Request password reset OTP
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save OTP with 10 minutes expiry
    user.password_reset = {
      otp,
      otp_expiry: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0
    };
    await user.save();

    // Send OTP email
    try {
      await sendEmail(user.email, emailTemplates.passwordResetOTP(user, otp));
      res.json({ message: 'OTP sent to your email', email: user.email });
    } catch (emailError) {
      console.error('OTP email failed:', emailError);
      res.status(500).json({ message: 'Failed to send OTP email' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if OTP exists
    if (!user.password_reset?.otp) {
      return res.status(400).json({ message: 'No OTP request found. Please request a new OTP.' });
    }

    // Check OTP expiry
    if (new Date() > user.password_reset.otp_expiry) {
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    // Check attempts
    if (user.password_reset.attempts >= 5) {
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (user.password_reset.otp !== otp) {
      user.password_reset.attempts += 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    // OTP verified
    res.json({ message: 'OTP verified successfully', verified: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    console.log('🔑 Password reset request for:', email);

    // Validate password
    if (!newPassword || newPassword.length < 8 || newPassword.length > 25) {
      return res.status(400).json({ message: 'Password must be between 8 and 25 characters' });
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json({ 
        message: 'Password must contain uppercase, lowercase, number and special character' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('🔍 Found user:', user.email);

    // Verify OTP one more time
    if (!user.password_reset?.otp || user.password_reset.otp !== otp) {
      console.log('❌ Invalid OTP');
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (new Date() > user.password_reset.otp_expiry) {
      console.log('❌ OTP expired');
      return res.status(400).json({ message: 'OTP expired' });
    }

    console.log('✅ OTP verified, updating password...');
    console.log('🔒 Old password hash (first 20 chars):', user.password.substring(0, 20));

    // Update password - the pre-save hook will hash it
    user.password = newPassword;
    user.password_reset = undefined; // Clear OTP data
    
    await user.save();
    
    console.log('🔒 New password hash (first 20 chars):', user.password.substring(0, 20));
    console.log('✅ Password reset successful for:', email);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getProfile, logout, updateProfile, verifyPassword, requestPasswordReset, verifyOTP, resetPassword };