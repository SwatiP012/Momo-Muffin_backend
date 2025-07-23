const express = require("express");
const bcryptjs = require("bcryptjs");
const User = require("../../models/User");
const {
  registerUser,
  loginUser,
  logoutUser,
  authMiddleware,
  verifyOTP,
  resendOTP,
  initiateOTPAuth,
  verifyOTPAuth,
  getUserDetails,
  registerAdmin,
} = require("../../controllers/auth/auth-controller");

const { registerSuperAdmin } = require("../../controllers/auth/superadmin-controller");

const router = express.Router();

// Traditional auth routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/check-auth", authMiddleware);

// Admin registration
router.post("/register-admin", registerAdmin);

// Super Admin registration (secured route)
router.post("/register-superadmin", registerSuperAdmin);

// OTP verification routes
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

// OTP-based authentication routes
router.post("/otp-auth/initiate", initiateOTPAuth);
router.post("/otp-auth/verify", verifyOTPAuth);

// Update user profile
router.put("/update-profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { userName, email, phoneNumber } = req.body;

    console.log("Profile update request:", { userId, userName, email, phoneNumber });

    // Validate required fields
    if (!userName || !email) {
      return res.status(400).json({
        success: false,
        message: "Username and email are required",
      });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: userId }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already taken by another user",
      });
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        userName: userName.trim(),
        email: email.toLowerCase().trim(),
        phoneNumber: phoneNumber?.trim() || null,
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("Profile updated successfully:", updatedUser);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// Change user password
router.put("/change-password/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    console.log("Password change request for user:", userId);

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Find user with password field
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check current password
    const isCurrentPasswordValid = await bcryptjs.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedNewPassword = await bcryptjs.hash(newPassword, 12);

    // Update password
    await User.findByIdAndUpdate(userId, {
      password: hashedNewPassword,
    });

    console.log("Password changed successfully for user:", userId);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

// Get user details
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Getting user details for:", userId);

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
});

module.exports = router;