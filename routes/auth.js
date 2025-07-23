const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  authMiddleware,
  verifyOTP,
  resendOTP
} = require("../controllers/auth/auth-controller");

// Authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

// OTP verification routes
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

// Other auth routes
// ...existing code...

module.exports = router;