const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodbridge');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create default admin user
    const adminUser = new User({
      email: 'admin@foodbridge.com',
      password: 'admin123', // Will be hashed by pre-save middleware
      role: 'admin',
      organization_name: 'FoodBridge Admin',
      contact_person: 'System Administrator',
      phone: '+1234567890',
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139] // Delhi coordinates
      },
      address: 'FoodBridge Headquarters, Delhi',
      is_verified: true
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@foodbridge.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

createAdminUser();