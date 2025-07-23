const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Creates a new notification
 * 
 * @param {Object} options - The notification options
 * @param {string} options.recipientId - The recipient user ID
 * @param {string} options.title - The notification title
 * @param {string} options.message - The notification message
 * @param {string} options.type - The notification type (info, warning, success, error, system)
 * @param {string} options.link - Optional link to navigate to
 * @param {string} options.createdById - Optional ID of the user who created the notification
 * @returns {Promise<Object>} The created notification
 */
const createNotification = async (options) => {
  const { 
    recipientId, 
    title, 
    message, 
    type = "info", 
    link = null, 
    createdById = null
  } = options;
  
  try {
    // Validate recipient exists
    const recipientExists = await User.exists({ _id: recipientId });
    if (!recipientExists) {
      console.log(`Recipient with ID ${recipientId} not found, skipping notification`);
      return null;
    }
    
    // Create notification
    const notification = new Notification({
      recipient: recipientId,
      title,
      message,
      type,
      link,
      createdBy: createdById,
      read: false
    });
    
    await notification.save();
    console.log(`Notification created for user ${recipientId}: ${title}`);
    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
};

/**
 * Creates notifications for all users with a specific role
 * 
 * @param {Object} options - The notification options
 * @param {string} options.role - The role of recipients (admin, superadmin, user)
 * @param {string} options.title - The notification title
 * @param {string} options.message - The notification message
 * @param {string} options.type - The notification type (info, warning, success, error, system)
 * @param {string} options.link - Optional link to navigate to
 * @param {string} options.createdById - Optional ID of the user who created the notification
 * @returns {Promise<number>} The number of notifications created
 */
const notifyByRole = async (options) => {
  const { 
    role, 
    title, 
    message, 
    type = "info", 
    link = null, 
    createdById = null
  } = options;
  
  try {
    // Find all users with the specified role
    const users = await User.find({ role }).select('_id');
    
    if (!users || users.length === 0) {
      console.log(`No users found with role: ${role}`);
      return 0;
    }
    
    console.log(`Found ${users.length} users with role ${role}`);
    
    // Create notifications for each user
    const notificationPromises = users.map(user => 
      createNotification({
        recipientId: user._id,
        title,
        message,
        type,
        link,
        createdById
      })
    );
    
    // Wait for all notifications to be created
    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    console.log(`Successfully created ${successCount} out of ${users.length} notifications`);
    return successCount;
  } catch (error) {
    console.error(`Failed to notify users with role ${role}:`, error);
    return 0;
  }
};

/**
 * Creates a system notification for a specific admin approval
 */
const notifyAdminApproval = async (adminId, approvedBy, approved = true) => {
  try {
    const admin = await User.findById(adminId);
    const superAdmin = await User.findById(approvedBy);
    
    if (!admin) {
      console.log(`Admin user ${adminId} not found`);
      return;
    }
    
    // Create notification for the admin
    await createNotification({
      recipientId: adminId,
      title: approved ? "Store Approved" : "Store Registration Rejected",
      message: approved 
        ? "Your store has been approved. You can now start adding products."
        : "Your store registration has been rejected. Please contact support for more information.",
      type: approved ? "success" : "error",
      link: "/admin/dashboard",
      createdById: approvedBy
    });
    
    // If we have the super admin info, create a record notification
    if (superAdmin) {
      await createNotification({
        recipientId: approvedBy,
        title: approved ? "Store Approved" : "Store Rejected",
        message: `You have ${approved ? 'approved' : 'rejected'} ${admin.userName}'s store registration.`,
        type: "info",
        link: "/superadmin/admins",
        createdById: approvedBy
      });
    }
    
    console.log(`Sent admin ${approved ? 'approval' : 'rejection'} notification to ${admin.email}`);
  } catch (error) {
    console.error("Failed to create admin approval notification:", error);
  }
};

module.exports = {
  createNotification,
  notifyByRole,
  notifyAdminApproval
};
