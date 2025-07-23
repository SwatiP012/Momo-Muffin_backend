const User = require("../models/User");
const { sendOTP } = require("../utils/sms-service");

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Test endpoint to generate and send OTP
exports.sendTestOTP = async (req, res) => {
  try {
    const { userId, phoneNumber } = req.body;
    
    if (!userId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "User ID and phone number are required"
      });
    }
    
    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
    
    // Save phone number if provided
    if (user.phoneNumber !== phoneNumber) {
      user.phoneNumber = phoneNumber;
    }
    
    // Save OTP to user
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();
    
    // Send OTP via SMS
    const otpResult = await sendOTP(phoneNumber, otp);
    
    return res.status(200).json({
      success: true,
      message: otpResult.success ? "OTP sent successfully" : "OTP generation successful but sending failed",
      development: `OTP: ${otp} (for testing only)`,
      twilioResult: otpResult
    });
  } catch (error) {
    console.error("Test OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send test OTP",
      error: error.message
    });
  }
};
