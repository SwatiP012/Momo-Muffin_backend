const jwt = require('jsonwebtoken');
require('dotenv').config();

// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No token provided"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "CLIENT_SECRET_KEY");
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid token"
    });
  }
};

// Check if user is admin or super admin
const isAdmin = (req, res, next) => {
  isAuthenticated(req, res, () => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin role required"
      });
    }
  });
};

// Check if user is super admin only
const isSuperAdmin = (req, res, next) => {
  isAuthenticated(req, res, () => {
    if (req.user && req.user.role === 'superadmin') {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Super Admin role required"
      });
    }
  });
};

module.exports = {
  isAuthenticated,
  isAdmin,
  isSuperAdmin
};
