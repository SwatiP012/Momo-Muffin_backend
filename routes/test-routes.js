const express = require("express");
const { sendTestOTP } = require("../controllers/test-controller");

const router = express.Router();

// Test endpoint to send OTP
router.post("/send-otp", sendTestOTP);

// Simple ping route
router.get("/ping", (req, res) => {
  res.json({
    success: true,
    message: "Test API is working",
    timestamp: new Date().toISOString(),
  });
});

// Simple echo route
router.post("/echo", (req, res) => {
  res.json({
    success: true,
    data: req.body,
    message: "Echo test successful",
  });
});

module.exports = router;
