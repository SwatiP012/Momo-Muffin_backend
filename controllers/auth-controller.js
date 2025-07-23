const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendOTP } = require("../utils/sms-service");
require('dotenv').config();

// Generate random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register User
exports.register = async (req, res) => {
  try {
    console.log("Register request received:", req.body);
    const { userName, email, password, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Check if phone number already exists (if provided)
    if (phoneNumber) {
      const phoneExists = await User.findOne({ phoneNumber });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "Phone number already registered",
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      userName,
      email,
      password: hashedPassword,
      phoneNumber,
      role: "customer", // Default role
    });

    // Generate OTP if phone number provided
    let otpResult = { success: true };
    if (phoneNumber) {
      const otp = generateOTP();
      newUser.otp = otp;
      newUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Send OTP via SMS
      otpResult = await sendOTP(phoneNumber, otp);
      if (!otpResult.success) {
        return res.status(400).json({
          success: false,
          message: `SMS could not be sent: ${otpResult.message}`,
        });
      }
    }

    // Save user to database
    await newUser.save();
    console.log("User registration successful. ID:", newUser._id);

    // Return response
    return res.status(201).json({
      success: true,
      message: phoneNumber 
        ? "Registration successful. Please verify your phone number." 
        : "Registration successful. Please login.",
      userId: newUser._id,
      requiresVerification: !!phoneNumber,
      smsSent: otpResult.success
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later.",
    });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    console.log("OTP verification request:", { userId, otp });

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate OTP
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code",
      });
    }

    // Check if OTP expired
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired",
      });
    }

    // Mark phone as verified and clear OTP
    user.isPhoneVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    
    await user.save();
    console.log("Phone verification successful for user:", userId);

    return res.status(200).json({
      success: true,
      message: "Phone number verified successfully",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Verification failed. Please try again later.",
    });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log("Resend OTP request for user:", userId);

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "No phone number associated with this account",
      });
    }

    // Generate new OTP and update expiry
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Send OTP via SMS
    const otpResult = await sendOTP(user.phoneNumber, otp);
    if (!otpResult.success) {
      return res.status(400).json({
        success: false,
        message: `SMS could not be sent: ${otpResult.message}`,
      });
    }

    await user.save();
    console.log("OTP resent successfully for user:", userId);

    return res.status(200).json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resend verification code. Please try again later.",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if phone is verified
    if (!user.isPhoneVerified) {
      // Generate a new OTP for verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      // Send OTP
      await sendOTP(user.phoneNumber, otp);

      return res.status(400).json({
        success: false,
        message: "Phone number not verified. A new OTP has been sent.",
        requiresVerification: true,
        userId: user._id,
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Set token as cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ...other existing methods...
