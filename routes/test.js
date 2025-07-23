const express = require("express");
const router = express.Router();
const { testSendOTP } = require("../controllers/auth/test-controller");

// Test routes
router.post("/send-test-otp", testSendOTP);

module.exports = router;
