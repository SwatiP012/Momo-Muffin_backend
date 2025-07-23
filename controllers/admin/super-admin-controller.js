const User = require('../../models/User');

// Get all admin users
const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password');
    
    res.status(200).json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins'
    });
  }
};

// Get all pending admin approvals
const getPendingAdmins = async (req, res) => {
  try {
    const pendingAdmins = await User.find({ 
      role: 'admin',
      adminVerified: false
    }).select('-password');
    
    res.status(200).json({
      success: true,
      data: pendingAdmins
    });
  } catch (error) {
    console.error('Error fetching pending admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending admins'
    });
  }
};

// Approve an admin
const approveAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    if (admin.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'User is not an admin'
      });
    }
    
    admin.adminVerified = true;
    admin.approvedBy = req.user.id;
    await admin.save();
    
    res.status(200).json({
      success: true,
      message: 'Admin approved successfully',
      data: admin
    });
  } catch (error) {
    console.error('Error approving admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve admin'
    });
  }
};

// Revoke admin access
const revokeAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    if (admin.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'User is not an admin'
      });
    }
    
    admin.adminVerified = false;
    await admin.save();
    
    res.status(200).json({
      success: true,
      message: 'Admin access revoked successfully',
      data: admin
    });
  } catch (error) {
    console.error('Error revoking admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke admin access'
    });
  }
};

// Get admin statistics
const getAdminStats = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // This would be expanded with product/order stats in a real implementation
    const stats = {
      userId: admin._id,
      userName: admin.userName,
      email: admin.email,
      phoneNumber: admin.phoneNumber,
      storeName: admin.storeName,
      adminVerified: admin.adminVerified,
      // Sample stats - would be populated from products/orders collections
      productsCount: 0,
      ordersCount: 0,
      revenue: 0
    };
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin statistics'
    });
  }
};

module.exports = {
  getAllAdmins,
  getPendingAdmins,
  approveAdmin,
  revokeAdmin,
  getAdminStats
};
