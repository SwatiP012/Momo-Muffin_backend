const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const productsRoutes = require("./products-routes");
const orderRoutes = require("./order-routes");
const { 
  getDashboardStats, 
  getInventoryStatus, 
  getBusinessInsights 
} = require("../../controllers/admin/stats-controller");

// First apply auth middleware to all routes
router.use(authMiddleware);

// Check if user is an admin
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required."
    });
  }
  next();
};

// Apply admin check middleware
router.use(adminAuth);

// Dashboard stats endpoints
router.get("/stats", getDashboardStats);
router.get("/inventory-status", getInventoryStatus);
router.get("/business-insights", getBusinessInsights);

// Register product and order routes
router.use("/products", productsRoutes);
router.use("/orders", orderRoutes);

module.exports = router;
