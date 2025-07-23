const twilio = require('twilio');
require('dotenv').config();

// Get Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client if credentials are available
let client;
try {
  if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
    console.log("Twilio client initialized");
  } else {
    console.log("Twilio credentials not found, SMS functionality will be limited");
  }
} catch (error) {
  console.error("Failed to initialize Twilio client:", error);
}

/**
 * Format phone number to E.164 format
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - The formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  // Remove any non-digit characters
  let digits = phoneNumber.replace(/\D/g, '');
  
  // If the number doesn't start with a country code, add +91 (India) by default
  // Modify this logic based on your target countries
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  
  // If it's already has a country code (starts with +), just normalize it
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // If it doesn't have a plus but has a country code (e.g. 91XXXXXXXXXX)
  if (digits.length > 10) {
    return `+${digits}`;
  }
  
  // Default case - just add + at the beginning
  return `+${digits}`;
};

/**
 * Send OTP via SMS
 * @param {string} phoneNumber - Recipient's phone number
 * @param {string} otp - OTP code to send
 * @returns {Promise} - Result of the SMS operation
 */
exports.sendOTP = async (phoneNumber, otp) => {
  try {
    // Skip SMS for test numbers (for development)
    if (phoneNumber === '1234567890' || phoneNumber === 'test') {
      console.log(`Test SMS: Your OTP is ${otp}`);
      return { success: true, message: 'Test OTP generated' };
    }
    
    // Format the phone number
    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log(`Sending OTP to formatted number: ${formattedNumber}`);
    
    // If Twilio client is not available, log the OTP and return success
    if (!client) {
      console.log(`SMS functionality limited. OTP for ${formattedNumber}: ${otp}`);
      return { 
        success: true, 
        sid: 'MOCK-SID-' + Date.now()
      };
    }

    // Send the actual SMS via Twilio
    const message = await client.messages.create({
      body: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
      from: fromNumber,
      to: formattedNumber
    });

    console.log(`SMS sent successfully! SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('Error sending SMS:', error);

    // For production, still log the OTP if SMS fails
    console.log(`SMS failed but OTP generated for ${phoneNumber}: ${otp}`);
    
    // Return success to prevent blocking the auth flow
    return { 
      success: true,
      fallback: true
    };
  }
};
