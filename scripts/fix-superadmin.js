const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function fixSuperAdmin() {
  try {
    // Connect to MongoDB with the correct database name
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/momo');
    console.log('Connected to MongoDB');
    
    // Find all users to diagnose the issue
    const allUsers = await User.find({}, 'email role isActive');
    console.log('All users in database:', allUsers);
    
    // Look for existing super admin by role
    const existingSuperadmin = await User.findOne({ role: 'superadmin' });
    
    if (existingSuperadmin) {
      console.log('Found existing super admin:', existingSuperadmin);
      
      // Fix super admin credentials to ensure it's working
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      
      existingSuperadmin.email = 'admin@momomuffin.com';
      existingSuperadmin.password = hashedPassword;
      existingSuperadmin.isActive = true;
      existingSuperadmin.isPhoneVerified = true;
      
      await existingSuperadmin.save();
      
      console.log('Super admin fixed and credentials reset:');
      console.log(' - Email:', existingSuperadmin.email);
      console.log(' - Password: Admin@123');
      console.log(' - Active:', existingSuperadmin.isActive);
    } else {
      console.log('No super admin found. Creating new one...');
      
      // Create a new super admin
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      
      const superAdmin = new User({
        userName: 'Super Admin',
        email: 'admin@momomuffin.com',
        password: hashedPassword,
        phoneNumber: '63002519856',
        role: 'superadmin',
        isActive: true,
        isPhoneVerified: true,
      });
      
      await superAdmin.save();
      
      console.log('New super admin created successfully!');
      console.log('Login credentials:');
      console.log(' - Email: admin@momomuffin.com');
      console.log(' - Password: Admin@123');
    }
  } catch (error) {
    console.error('Error fixing super admin:', error);
  } finally {
    mongoose.disconnect();
    console.log('Database connection closed');
  }
}

fixSuperAdmin();
