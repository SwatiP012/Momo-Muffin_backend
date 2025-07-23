const User = require("../../models/User");
const { sendOTP } = require("../../utils/sms-service");

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Test OTP generation and sending
const testSendOTP = async (req, res) => {
  try {
    const { userId, phoneNumber } = req.body;
    
    if (!userId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "User ID and phone number are required"
      });
    }
    
    // Find user
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
    
    // Update user's phone number if different
    if (user.phoneNumber !== phoneNumber) {
      user.phoneNumber = phoneNumber;
    }
    
    // Update OTP
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();
    
    // Send OTP
    const otpResult = await sendOTP(phoneNumber, otp);
    
    if (otpResult.success) {
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        development: `OTP: ${otp} (visible in development only)`
      });
    } else {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
        development: `OTP: ${otp} (visible in development only)`
      });
    }
  } catch (error) {
    console.error("Test OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message
    });
  }
};

module.exports = {
  testSendOTP
};
