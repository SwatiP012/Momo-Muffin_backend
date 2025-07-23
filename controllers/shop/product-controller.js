const Product = require("../../models/Product");
const User = require("../../models/User");

// Add Product - Now with adminId
const addProduct = async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);
    const adminId = req.user.id;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required"
      });
    }

    const admin = await User.findById(adminId);

    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to add products"
      });
    }

    // --- FIX: Destructure featured and handle it explicitly ---
    const { featured, ...rest } = req.body;
    const newProduct = new Product({
      ...rest,
      featured: featured === true || featured === "true" || featured === "on" ? true : false,
      adminId,
      storeName: admin.storeName || 'Store',
      isApproved: admin.role === 'superadmin',
      ...(admin.role === 'superadmin' ? {
        approvedBy: adminId,
        approvedAt: new Date()
      } : {})
    });
    // ----------------------------------------------------------

    const savedProduct = await newProduct.save();

    res.status(201).json({
      success: true,
      data: savedProduct,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Failed to add product",
    });
  }
};

// Get all products - With filtering by admin
const getAllProducts = async (req, res) => {
  console.log("getAllProducts called");
  try {
    const { adminId, approved, category, search, inStock } = req.query;
    let filter = {};

    // Optional filters based on query params
    if (adminId) {
      filter.adminId = adminId;
    }
    if (approved !== undefined) {
      filter.isApproved = approved === 'true';
    }
    if (category) {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (inStock !== undefined) {
      filter.totalStock = { $gt: 0 };
    }

    // REMOVE all user/role-based filtering so public sees all products

    const products = await Product.find(filter);

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

// Get a single product - With ownership check
const getProductDetails = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user has access to this product
    if (req.user) {
      // Superadmin can access any product
      if (req.user.role === 'superadmin') {
        // Allow access
      }
      // Admin can only access their own products
      else if (req.user.role === 'admin') {
        if (product.adminId.toString() !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: "You don't have permission to access this product"
          });
        }
      }
      // Regular users can access any product
    }
    // Unauthenticated users can access any product

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product details",
    });
  }
};

// Update product - With ownership check
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Only allow the owner admin or superadmin to update the product
    if (req.user.role !== 'superadmin' && product.adminId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this product"
      });
    }

    // Ensure featured is boolean
    let updateData = { ...req.body };
    if (updateData.featured !== undefined) {
      updateData.featured =
        updateData.featured === "true" ||
        updateData.featured === true ||
        updateData.featured === "on";
    }

    // Preserve existing adminId and don't let it be changed
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        adminId: product.adminId, // Ensure adminId doesn't change
        // If a regular admin updates product, reset approval status
        ...(req.user.role === 'admin' ? { isApproved: false, approvedBy: null, approvedAt: null } : {})
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedProduct,
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

// Delete product - With ownership check
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    
    // Only allow the owner admin or superadmin to delete the product
    if (req.user.role !== 'superadmin' && product.adminId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this product"
      });
    }
    
    await Product.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};

// New endpoint for approving products (superadmin only)
const approveProduct = async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: "Only superadmins can approve products"
      });
    }
    
    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    // Update approval status
    product.isApproved = true;
    product.approvedBy = req.user.id;
    product.approvedAt = new Date();
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: "Product approved successfully",
      data: product
    });
  } catch (error) {
    console.error('Error approving product:', error);
    res.status(500).json({
      success: false,
      message: "Failed to approve product"
    });
  }
};

// New endpoint for rejecting products (superadmin only)
const rejectProduct = async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: "Only superadmins can reject products"
      });
    }
    
    const productId = req.params.id;
    const { reason } = req.body;
    
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    // Update approval status
    product.isApproved = false;
    product.rejectionReason = reason || "Rejected by administrator";
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: "Product rejected successfully",
      data: product
    });
  } catch (error) {
    console.error('Error rejecting product:', error);
    res.status(500).json({
      success: false,
      message: "Failed to reject product"
    });
  }
};

const getFeaturedProducts = async (req, res) => {
  try {
    const featuredProducts = await Product.find({ featured: true }).limit(8);
    res.json({ success: true, data: featuredProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch featured products" });
  }
};

module.exports = {
  addProduct,
  getAllProducts,
  getProductDetails,
  updateProduct,
  deleteProduct,
  approveProduct,
  rejectProduct,
  getFeaturedProducts
};