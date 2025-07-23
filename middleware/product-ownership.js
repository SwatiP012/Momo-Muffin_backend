const Product = require('../models/Product');

const checkProductOwnership = async (req, res, next) => {
  try {
    // Skip this middleware for superadmins
    if (req.user && req.user.role === 'superadmin') {
      return next();
    }
    
    // For admins, check if they own the product
    if (req.user && req.user.role === 'admin') {
      const productId = req.params.id;
      
      if (!productId) {
        return next();
      }
      
      const product = await Product.findById(productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      // Check if the admin owns this product
      if (product.adminId && product.adminId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this product'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Error checking product ownership:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = checkProductOwnership;
