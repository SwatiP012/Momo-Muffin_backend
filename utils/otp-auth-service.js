const User = require('../models/User');
const { sendOTP } = require('./sms-service');

// Generate random OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP for authentication
const sendAuthOTP = async (phoneNumber) => {
  try {
    // Check if user exists with this phone number
    const existingUser = await User.findOne({ phoneNumber });
    const isNewUser = !existingUser;
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 minutes
    
    if (existingUser) {
      // Update existing user with new OTP
      existingUser.otp = otp;
      existingUser.otpExpiry = otpExpiry;
      await existingUser.save();
    }
    
    // Send OTP via SMS
    await sendOTP(phoneNumber, otp);
    
    return {
      success: true,
      isNewUser,
      message: isNewUser ? "OTP sent for registration" : "OTP sent for login"
    };
  } catch (error) {
    console.error("Error sending auth OTP:", error);
    return {
      success: false,
      message: "Failed to send verification code"
    };
  }
};

// Verify OTP for authentication
const verifyAuthOTP = async (phoneNumber, otp, userData = null) => {
  try {
    // Check if user exists with this phone number
    let user = await User.findOne({ phoneNumber });
    const isNewUser = !user;
    
    if (isNewUser && !userData) {
      return {
        success: false,
        message: "User registration requires additional data"
      };
    }
    
    if (!isNewUser) {
      // Verify OTP for existing user
      if (String(user.otp) !== String(otp)) {
        return {
          success: false,
          message: "Invalid verification code"
        };
      }
      
      // Check if OTP expired
      if (user.otpExpiry && new Date() > user.otpExpiry) {
        return {
          success: false,
          message: "Verification code expired"
        };
      }
      
      // Clear OTP after successful verification
      user.otp = undefined;
      user.otpExpiry = undefined;
      user.isPhoneVerified = true;
      user.isActive = true;
      
      await user.save();
    } else {
      // Create new user for first-time registration
      user = new User({
        userName: userData.userName || `User${Date.now().toString().slice(-4)}`,
        email: userData.email || null,
        phoneNumber,
        isPhoneVerified: true,
        isActive: true,
        role: 'user',
      });
      
      await user.save();
    }
    
    return {
      success: true,
      isNewUser,
      message: isNewUser ? "Registration successful" : "Login successful",
      user: {
        id: user._id,
        userName: user.userName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    console.error("Error verifying auth OTP:", error);
    return {
      success: false,
      message: "Verification failed"
    };
  }
};

module.exports = {
  sendAuthOTP,
  verifyAuthOTP
};
