const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function ensureSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('Connected to MongoDB');
    
    // Check all users in the database
    const allUsers = await User.find({});
    console.log('All users in database:', allUsers.map(u => ({ 
      id: u._id,
      email: u.email, 
      role: u.role,
      isActive: u.isActive
    })));
    
    // Check if super admin exists by role
    const existingSuperadmin = await User.findOne({ role: 'superadmin' });
    
    // Credentials to use
    const superAdminData = {
      userName: 'Super Admin',
      email: 'admin@momomuffin.com',
      phoneNumber: '63002519856',
      password: 'Admin@123',
      role: 'superadmin',
      isActive: true,
      isPhoneVerified: true,
    };
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(superAdminData.password, 12);
    
    if (existingSuperadmin) {
      console.log('Found existing super admin:', existingSuperadmin);
      
      // Force update all fields to ensure it works
      existingSuperadmin.userName = superAdminData.userName;
      existingSuperadmin.email = superAdminData.email;
      existingSuperadmin.password = hashedPassword;
      existingSuperadmin.phoneNumber = superAdminData.phoneNumber;
      existingSuperadmin.role = 'superadmin'; // Ensure role is set
      existingSuperadmin.isActive = true;
      existingSuperadmin.isPhoneVerified = true;
      
      await existingSuperadmin.save();
      
      console.log('Super admin updated successfully!');
    } else {
      // Create a new super admin
      const superAdmin = new User({
        userName: superAdminData.userName,
        email: superAdminData.email,
        password: hashedPassword,
        phoneNumber: superAdminData.phoneNumber,
        role: 'superadmin',
        isActive: true,
        isPhoneVerified: true,
      });
      
      await superAdmin.save();
      
      console.log('Super admin created successfully!');
    }
    
    // Verify super admin exists
    const verifyAdmin = await User.findOne({ role: 'superadmin' });
    console.log('Verified super admin exists:', verifyAdmin ? 'Yes' : 'No');
    console.log('Super admin login details:');
    console.log(' - Email: admin@momomuffin.com');
    console.log(' - Password: Admin@123');
    
  } catch (error) {
    console.error('Error managing super admin:', error);
  } finally {
    mongoose.disconnect();
    console.log('Database connection closed');
  }
}

ensureSuperAdmin();
