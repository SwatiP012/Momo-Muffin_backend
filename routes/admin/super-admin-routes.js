const express = require('express');
const { 
  getAllAdmins,
  getPendingAdmins,
  approveAdmin,
  revokeAdmin,
  getAdminStats
} = require('../../controllers/admin/super-admin-controller');
const { isSuperAdmin } = require('../../middleware/auth-middleware');

const router = express.Router();

// Apply superadmin middleware to all routes
router.use(isSuperAdmin);

// Admin management routes
router.get('/admins', getAllAdmins);
router.get('/admins/pending', getPendingAdmins);
router.patch('/admins/:adminId/approve', approveAdmin);
router.patch('/admins/:adminId/revoke', revokeAdmin);
router.get('/admins/:adminId/stats', getAdminStats);

module.exports = router;
