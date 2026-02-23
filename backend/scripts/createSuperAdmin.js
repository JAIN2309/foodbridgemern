const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodbridge');
    
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('Super Admin user already exists:', existingSuperAdmin.email);
      process.exit(0);
    }

    // Create super admin user
    const superAdminUser = new User({
      email: 'superadmin@foodbridge.com',
      password: 'superadmin123', // Will be hashed by pre-save middleware
      role: 'super_admin',
      organization_name: 'FoodBridge Super Admin',
      contact_person: 'Super Administrator',
      phone: '+1234567891',
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139] // Delhi coordinates
      },
      address: 'FoodBridge Headquarters, Delhi',
      is_verified: true
    });

    await superAdminUser.save();
    console.log('✅ Super Admin user created successfully!');
    console.log('📧 Email: superadmin@foodbridge.com');
    console.log('🔑 Password: superadmin123');
    console.log('⚠️  Please change the password after first login');
    
  } catch (error) {
    console.error('❌ Error creating super admin user:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

createSuperAdmin();