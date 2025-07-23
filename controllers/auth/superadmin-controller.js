const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
require('dotenv').config();

// Register super admin - this should only be accessible in development or with a secure code
const registerSuperAdmin = async (req, res) => {
  const { userName, email, password, phoneNumber, securityCode } = req.body;

  // Check if the security code is valid
  // This adds an extra layer of protection to prevent unauthorized superadmin creation
  const validSecurityCode = process.env.SUPERADMIN_CODE || "super-secure-code-1234";
  if (securityCode !== validSecurityCode) {
    return res.status(403).json({
      success: false,
      message: "Invalid security code for super admin registration"
    });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: { $regex: new RegExp(`^${email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } },
        { phoneNumber }
      ] 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or phone number already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new super admin user
    const newSuperAdmin = new User({
      userName,
      email,
      password: hashedPassword,
      phoneNumber,
      role: "superadmin", // Set role to superadmin
      isActive: true, // Super admin is active by default
      isPhoneVerified: true // Skip phone verification for super admin
    });

    await newSuperAdmin.save();

    // Generate token
    const token = jwt.sign(
      {
        id: newSuperAdmin._id,
        role: newSuperAdmin.role,
        email: newSuperAdmin.email,
        userName: newSuperAdmin.userName
      },
      process.env.JWT_SECRET || "CLIENT_SECRET_KEY",
      { expiresIn: "1h" }
    );

    // Set cookie and return user data
    return res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000, // 1 hour
        sameSite: 'lax'
      })
      .status(201)
      .json({
        success: true,
        message: "Super admin created successfully",
        user: {
          id: newSuperAdmin._id,
          userName: newSuperAdmin.userName,
          email: newSuperAdmin.email,
          role: newSuperAdmin.role,
          phoneNumber: newSuperAdmin.phoneNumber
        }
      });
  } catch (error) {
    console.error("Super admin registration error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during registration"
    });
  }
};

module.exports = {
  registerSuperAdmin
};
