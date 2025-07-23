const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function createOrUpdateSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('Connected to MongoDB');
    
    // Set your preferred credentials
    const newCredentials = {
      userName: 'Super Admin',
      email: 'admin@momomuffin.com',
      phoneNumber: '63002519856',
      password: 'Admin@123' // This will be hashed before saving
    };
    
    // Check if superadmin already exists
    const existingSuperadmin = await User.findOne({ role: 'superadmin' });
    
    if (existingSuperadmin) {
      console.log('Found existing super admin:', existingSuperadmin.email);
      console.log('Updating super admin credentials...');
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newCredentials.password, 12);
      
      // Update the existing super admin
      existingSuperadmin.userName = newCredentials.userName;
      existingSuperadmin.email = newCredentials.email;
      existingSuperadmin.password = hashedPassword;
      existingSuperadmin.phoneNumber = newCredentials.phoneNumber;
      
      await existingSuperadmin.save();
      
      console.log('Super admin updated successfully!');
      console.log('New Email:', newCredentials.email);
      console.log('New Password:', newCredentials.password);
    } else {
      // Create a new super admin if none exists
      const hashedPassword = await bcrypt.hash(newCredentials.password, 12);
      
      const superAdmin = new User({
        userName: newCredentials.userName,
        email: newCredentials.email,
        password: hashedPassword,
        phoneNumber: newCredentials.phoneNumber,
        role: 'superadmin',
        isActive: true,
        isPhoneVerified: true,
      });
      
      await superAdmin.save();
      
      console.log('New super admin created successfully!');
      console.log('Email:', newCredentials.email);
      console.log('Password:', newCredentials.password);
    }
  } catch (error) {
    console.error('Error managing super admin:', error);
  } finally {
    mongoose.disconnect();
    console.log('Database connection closed');
  }
}

createOrUpdateSuperAdmin();
