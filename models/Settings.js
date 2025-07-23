const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    // Site settings
    siteName: {
      type: String,
      default: "Momo Muffin"
    },
    contactEmail: {
      type: String,
      default: ""
    },
    supportPhone: {
      type: String,
      default: ""
    },
    allowRegistrations: {
      type: Boolean,
      default: true
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    storeApprovalRequired: {
      type: Boolean,
      default: true
    },
    siteDescription: {
      type: String,
      default: ""
    },
    
    // Content settings
    privacyPolicy: {
      type: String,
      default: ""
    },
    termsOfService: {
      type: String,
      default: ""
    },
    footerText: {
      type: String,
      default: "© Copyright Momo Muffin. All Rights Reserved."
    },
    
    // Email settings
    emailNotifications: {
      type: Boolean,
      default: true
    },
    welcomeEmailEnabled: {
      type: Boolean,
      default: true
    },
    orderConfirmationEnabled: {
      type: Boolean,
      default: true
    },
    adminNotificationsEmail: {
      type: String,
      default: ""
    },
    
    // Metadata
    updatedAt: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  }
);

module.exports = mongoose.model("Settings", settingsSchema);
