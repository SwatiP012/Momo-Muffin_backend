const Product = require("../../models/Product");
const User = require("../../models/User"); // Import User model

// Try to import express-validator, but handle gracefully if it's missing
let validationResult;
try {
  ({ validationResult } = require("express-validator"));
} catch (error) {
  // Define a fallback validationResult function
  validationResult = (req) => ({
    isEmpty: () => true,
    array: () => [],
  });
  console.warn("express-validator not found, using fallback validation");
}

// Removed handleImageUpload as frontend uploads directly to Cloudinary
// exports.handleImageUpload = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No file uploaded",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       result: {
//         url: req.file.path || `/uploads/${req.file.filename}`,
//         public_id: req.file.filename,
//       },
//     });
//   } catch (error) {
//     console.error("Image upload error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error uploading image",
//     });
//   }
// };

// Add new product
exports.addProduct = async (req, res) => {
  try {
    // Check user is admin
    if (req.user.role !== "admin" && req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can add products",
      });
    }

    const {
      title,
      description,
      price,
      salePrice,
      category,
      productType,
      totalStock,
      colors,
      sizes,
      image, // image URL received from frontend
    } = req.body;

    // Basic validation
    if (!title || !price || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, price and category are required",
      });
    }

    // Fetch admin user to get store ID
    const adminUser = await User.findById(req.user._id).populate('adminStore'); // Assuming 'adminStore' is the field linking user to store

    if (!adminUser || !adminUser.adminStore) {
      return res.status(400).json({
        success: false,
        message: "Admin user or associated store not found."
      });
    }

    const storeId = adminUser.adminStore._id;

    // Create product with admin association and set isApproved to true by default
    const product = new Product({
      title,
      description,
      price,
      salePrice: salePrice || 0,
      category,
      productType: productType || "regular",
      totalStock: totalStock || 0,
      colors: colors || [],
      sizes: sizes || [],
      image, // Save the image URL
      featured: req.body.featured === true || req.body.featured === "true" || req.body.featured === "on" ? true : false, // <-- Add this line
      adminId: req.user._id,
      store: adminUser.adminStore._id,
      storeId: storeId,
      storeName: adminUser.adminStore.storeName || "Admin Store",
      isApproved: true,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding product",
    });
  }
};

// Edit product
// Edit product
exports.editProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    // Ensure featured is boolean if present
    if (updateData.featured !== undefined) {
      updateData.featured =
        updateData.featured === true ||
        updateData.featured === "true" ||
        updateData.featured === "on";
    }

    // ...existing code...
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    if (
      req.user.role !== "superadmin" &&
      product.adminId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own products",
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { ...updateData },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Edit product error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating product",
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // First find the product to check ownership
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if this user owns the product (if not superadmin)
    if (
      req.user.role !== "superadmin" &&
      product.adminId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own products",
      });
    }

    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting product",
    });
  }
};

// Fetch all products for admin
exports.fetchAllProducts = async (req, res) => {
  try {
    // If regular admin, show only their products
    let query = {};
    if (req.user.role === "admin") {
      query.adminId = req.user._id;
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Fetch products error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
    });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const { storeId } = req.query;
    const filter = storeId ? { store: storeId } : {};
    const products = await Product.find(filter);
    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching products" });
  }
};