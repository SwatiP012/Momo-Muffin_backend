const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// Super admin credentials - CUSTOMIZE THESE
const superAdminData = {
  userName: 'Super Admin',
  email: 'admin@momomuffin.com',
  password: 'Admin@123',
  phoneNumber: '1234567890' // Use any valid phone number
};

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/momo');
    console.log('Connected to MongoDB');
    
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: superAdminData.email });
    
    if (existingUser) {
      console.log(`User with email ${superAdminData.email} already exists. Converting to superadmin...`);
      
      // Update existing user to be super admin
      existingUser.role = 'superadmin';
      existingUser.isActive = true;
      existingUser.isPhoneVerified = true;
      existingUser.password = await bcrypt.hash(superAdminData.password, 12);
      
      await existingUser.save();
      console.log('Existing user converted to super admin successfully!');
    } else {
      // Create a new super admin user
      const hashedPassword = await bcrypt.hash(superAdminData.password, 12);
      
      const newSuperAdmin = new User({
        userName: superAdminData.userName,
        email: superAdminData.email,
        password: hashedPassword,
        phoneNumber: superAdminData.phoneNumber,
        role: 'superadmin',
        isActive: true,
        isPhoneVerified: true
      });
      
      await newSuperAdmin.save();
      console.log('Super admin created successfully!');
    }
    
    console.log('Super admin login details:');
    console.log('Email:', superAdminData.email);
    console.log('Password:', superAdminData.password);
    
    // Verify super admin exists
    const verifyAdmin = await User.findOne({ role: 'superadmin' });
    if (verifyAdmin) {
      console.log('Verified: Super admin exists in database');
    } else {
      console.log('Warning: Failed to verify super admin exists');
    }
  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

// Run the function
createSuperAdmin();
