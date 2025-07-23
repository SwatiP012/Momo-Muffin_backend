const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const {
  getDashboardStats,
  getPendingAdmins,
  approveAdmin,
  rejectAdmin,
  getAllAdmins,
  getSettings,
  updateSettings,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getAdminDetails,
  getAdminStats
} = require("../../controllers/superadmin/superadmin-controller");
const { getAllStores, approveStore, rejectStore } = require("../../controllers/admin/store-controller");

// Super Admin Authentication Middleware
const superAdminAuth = (req, res, next) => {
  // Make sure req.user is available from authMiddleware
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  // Check if user is a super admin
  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Super admin privileges required."
    });
  }

  // If we reach here, the user is authenticated as a super admin
  next();
};

// First apply auth middleware to all routes
router.use(authMiddleware);

// Then apply super admin check
router.use(superAdminAuth);

// Now define the routes
router.get("/stats", getDashboardStats);
router.get("/admins/pending", getPendingAdmins);
router.get("/admins", getAllAdmins);
router.put("/admins/:adminId/approve", approveAdmin);
router.put("/admins/:adminId/reject", rejectAdmin);
router.get("/settings", getSettings);
router.post("/settings", updateSettings);
router.get("/stores", getAllStores);
router.get("/admin-details/:adminId", getAdminDetails); // Assuming this is to fetch details of a specific admin
router.get("/admin-stats/:adminId", getAdminStats);


// Notification routes
router.get("/notifications", getNotifications);
router.put("/notifications/:notificationId/read", markNotificationRead);
router.put("/notifications/read-all", markAllNotificationsRead);

// Add explicit store approval/rejection routes
router.put("/stores/:storeId/approve", approveStore);
router.put("/stores/:storeId/reject", rejectStore);

module.exports = router;
