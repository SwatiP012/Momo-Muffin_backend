const User = require("../../models/User");
const Settings = require("../../models/Settings");
const Notification = require("../../models/Notification");
const { notifyAdminApproval } = require("../../utils/notification-service");
const Store = require("../../models/Store");
// const Product = require("../../models/Product");
// We'll handle missing models gracefully

// Get dashboard statistics for super admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Check if user has superadmin role
    if (!req.user || req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Super admin privileges required."
      });
    }

    // Count users by role
    const [totalUsers, totalAdmins, pendingAdmins] = await Promise.all([
      User.countDocuments({ role: "user" }).exec(),
      User.countDocuments({ role: "admin", adminVerified: true }).exec(),
      User.countDocuments({ role: "admin", adminVerified: false }).exec()
    ]);

    // For now, set initial values for other stats that might not have models yet
    let totalProducts = 0;
    let totalOrders = 0;
    let totalRevenue = 0;

    // Try to load other stats if models exist
    try {
      // These might fail if models don't exist, and that's okay
      const Product = require("../../models/Product");
      totalProducts = await Product.countDocuments().exec();
    } catch (err) {
      console.log("Product model not available, using default value");
    }

    try {
      const Order = require("../../models/Order");
      totalOrders = await Order.countDocuments().exec();

      // Sum up revenue if possible
      const revenueData = await Order.aggregate([
        { $match: { orderStatus: "confirmed" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]);

      if (revenueData && revenueData.length > 0) {
        totalRevenue =  revenueData[0].total;
      }
    } catch (err) {
      console.log("Order model not available, using default values");
    }

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalAdmins,
        pendingAdmins,
        totalProducts,
        totalOrders,
        totalRevenue
      }
    });
  } catch (error) {
    console.error("Error fetching super admin stats:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics"
    });
  }
};

// Get pending admin approvals
exports.getPendingAdmins = async (req, res) => {
  try {
    // Find all admin users that are not verified
    const pendingAdmins = await User.find(
      { role: "admin", adminVerified: false },
      { password: 0, otp: 0, otpExpiry: 0 } // Exclude sensitive fields
    ).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: pendingAdmins
    });
  } catch (error) {
    console.error("Error fetching pending admins:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching pending admin list"
    });
  }
};

// Approve an admin
exports.approveAdmin = async (req, res) => {
  try {
    const adminId = req.params.adminId;

    // 1. Approve the admin (your existing logic)
    await User.findByIdAndUpdate(adminId, { adminVerified: true });

    // 2. Update the store status for this admin
    await Store.findOneAndUpdate(
      { owner: adminId },
      { status: "approved" }
    );

    res.json({ success: true, message: "Admin and store approved" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Reject an admin
exports.rejectAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Find the admin user
    const admin = await User.findOne({
      _id: adminId,
      role: "admin",
      adminVerified: false
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found or already verified"
      });
    }

    // Create notification before changing role
    await notifyAdminApproval(adminId, req.user.id, false);

    // Change role to regular user
    admin.role = "user";
    await admin.save();

    // Update the store status for this admin to 'rejected'
    await Store.findOneAndUpdate(
      { owner: adminId },
      { status: "rejected" }
    );

    return res.status(200).json({
      success: true,
      message: "Admin and store rejected successfully"
    });
  } catch (error) {
    console.error("Error rejecting admin:", error);
    return res.status(500).json({
      success: false,
      message: "Error rejecting admin"
    });
  }
};

// Get all admins
exports.getAllAdmins = async (req, res) => {
  try {
    // Find all admins (both verified and pending)
    const admins = await User.find(
      { role: "admin" },
      { password: 0, otp: 0, otpExpiry: 0 } // Exclude sensitive fields
    ).sort({ adminVerified: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error("Error fetching all admins:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching admin list"
    });
  }
};

// Get system settings
exports.getSettings = async (req, res) => {
  try {
    // Try to find existing settings
    let settings = await Settings.findOne();

    // If no settings document exists yet, create one with defaults
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }

    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching system settings"
    });
  }
};

// Update system settings
exports.updateSettings = async (req, res) => {
  try {
    const settingsData = req.body;

    // Validate required fields
    if (!settingsData.siteName) {
      return res.status(400).json({
        success: false,
        message: "Site name is required"
      });
    }

    // Add metadata
    settingsData.updatedAt = new Date();
    settingsData.updatedBy = req.user.id;

    // Find and update or create new settings
    let settings = await Settings.findOne();

    if (settings) {
      // Update existing settings document
      Object.assign(settings, settingsData);
      await settings.save();
    } else {
      // Create new settings document
      settings = new Settings(settingsData);
      await settings.save();
    }

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: settings
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating system settings"
    });
  }
};

// Get notifications for super admin
exports.getNotifications = async (req, res) => {
  try {
    console.log(`Fetching notifications for super admin: ${req.user.id}`);

    const notifications = await Notification.find(
      { recipient: req.user._id }
    )
      .sort({ createdAt: -1 })
      .limit(10);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    });

    console.log(`Found ${notifications.length} notifications (${unreadCount} unread)`);

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching notifications"
    });
  }
};

// Mark notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    notification.read = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating notification"
    });
  }
};

// Mark all notifications as read
exports.markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating notifications"
    });
  }
};


// Get a single admin's details (with store info and stats)
exports.getAdminDetails = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const admin = await User.findById(adminId, { password: 0, otp: 0, otpExpiry: 0 });
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const store = await Store.findOne({ owner: adminId });

    let productsCount = 0;
    let ordersCount = 0;
    let revenue = 0;
    try {
      const Product = require("../../models/Product");
      const Order = require("../../models/Order");
      if (store) {
        // Use the correct field based on your Product schema:
        productsCount = await Product.countDocuments({ adminId: adminId });
        // If your Product model uses store reference, use:
        // productsCount = await Product.countDocuments({ store: store._id });

        ordersCount = await Order.countDocuments({ store: store._id, orderStatus: "confirmed" });
        // Or, if using store reference:
        // ordersCount = await Order.countDocuments({ store: store._id, status: "completed" });

        const revenueData = await Order.aggregate([
          { $match: { store: store._id, orderStatus: "confirmed" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        if (revenueData && revenueData.length > 0) {
          revenue = "₹" + revenueData[0].total;
        } else {
          revenue = "₹0";
        }
      }
    } catch (err) {
      // Models might not exist, that's okay
    }

    const adminDetails = {
      id: admin._id,
      userName: admin.userName,
      email: admin.email,
      phoneNumber: admin.phoneNumber,
      adminVerified: admin.adminVerified,
      createdAt: admin.createdAt,
      store: store ? {
        id: store._id,
        storeName: store.storeName,
        storeDescription: store.storeDescription,
        storeContact: store.storeContact,
        status: store.status,
        ...store.toObject()
      } : null,
      stats: {
        productsCount,
        ordersCount,
        revenue
      }
    };

    return res.json({ success: true, data: adminDetails });
  } catch (error) {
    console.error("Error fetching admin details:", error);
    return res.status(500).json({ success: false, message: "Error fetching admin details" });
  }
};

const Product = require("../../models/Product");
const Order = require("../../models/Order");

exports.getAdminStats = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    // Get all products for this admin
    const products = await Product.find({ adminId });
    const productIds = products.map(p => p._id);

    // Get all orders containing this admin's products
    const orders = await Order.find({ "cartItems.productId": { $in: productIds } });

    // Orders count
    const ordersCount = orders.length;

    // Revenue calculation
    let revenue = 0;
    orders
      .filter(order => order.orderStatus === "confirmed")
      .forEach(order => {
        order.cartItems.forEach(item => {
          if (productIds.map(id => id.toString()).includes(item.productId.toString())) {
            revenue += Number(item.price) * Number(item.quantity);
          }
        });
      });

    // Format as rupees
    revenue = "₹" + revenue;

    res.json({
      success: true,
      data: {
        productsCount: products.length,
        ordersCount,
        revenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch admin stats" });
  }
};