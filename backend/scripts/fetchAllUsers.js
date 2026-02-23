const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const fetchAllUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({})
      .select('email role password')
      .sort({ createdAt: -1 });

    console.log('\n=== ALL USERS DATA ===');
    console.log(`Total users found: ${users.length}\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password (hashed): ${user.password}`);
      console.log('   ---');
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fetchAllUsers();