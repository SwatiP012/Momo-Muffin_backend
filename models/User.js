const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      sparse: true, // Allow multiple null values but unique if provided
    },
    password: {
      type: String,
      // Not required anymore since users can register with just phone
    },
    phoneNumber: {
      type: String,
      required: true, // Now required as primary identifier
      unique: true,   // Must be unique
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin'],
      default: 'user'
    },
    adminVerified: {
      type: Boolean,
      default: true // Change this to true by default
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    adminStore: {
      storeName: { type: String },
      storeDescription: { type: String },
      createdAt: { type: Date }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
