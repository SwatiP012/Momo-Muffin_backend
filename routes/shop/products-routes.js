const express = require("express");
const router = express.Router();
const Product = require("../../models/Product");

console.log("products-routes.js loaded");

// Get all products with optional filters
router.get("/get", async (req, res) => {
  try {
    console.log("Request query:", req.query);
    const { category, searchQuery, sortBy, minPrice, maxPrice, storeId } = req.query;

    let filters = {};
    let sort = {};

    // Apply category filter
    if (category) {
      // If category is a comma-separated string, split it into array
      const categories = typeof category === 'string' ? category.split(',') : category;
      filters.category = { $in: Array.isArray(categories) ? categories : [categories] };
    }

    // Apply store filter - now using adminId to filter products by store admin
    if (storeId) {
      filters.adminId = storeId;
    }

    // Apply search filter if present
    if (searchQuery) {
      filters.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Apply price range filter
    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }

    // Apply sorting
    if (sortBy) {
      if (sortBy === "price-lowtohigh") sort.price = 1;
      else if (sortBy === "price-hightolow") sort.price = -1;
      else if (sortBy === "newest") sort.createdAt = -1;
    }

    console.log("Filters:", filters);
    console.log("Sort:", sort);

    const products = await Product.find(filters).sort(sort);
    console.log("Products from DB:", products, Array.isArray(products));
    return res.status(200).json({
      success: true,
      data: products,
      message: "Products fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      success: false,
      message: "Error occurred while fetching products",
      error: error.message
    });
  }
});

// Get product by ID with related products
router.get("/get/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Find related products (same category)
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: id }
    }).limit(4);

    return res.status(200).json({
      success: true,
      data: product,
      relatedProducts,
      message: "Product details fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    return res.status(500).json({
      success: false,
      message: "Error occurred while fetching product details",
      error: error.message
    });
  }
});

// Search products
router.get("/search/:keyword", async (req, res) => {
  try {
    const { keyword } = req.params;

    const products = await Product.find({
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { category: { $regex: keyword, $options: 'i' } },
        { productType: { $regex: keyword, $options: 'i' } }
      ]
    }).limit(20);

    return res.status(200).json({
      success: true,
      data: products,
      message: "Search results fetched successfully"
    });
  } catch (error) {
    console.error("Error searching products:", error);
    return res.status(500).json({
      success: false,
      message: "Error occurred while searching products",
      error: error.message
    });
  }
});

router.get('/products/by-store/:adminId', async (req, res) => {
  try {
    const products = await Product.find({
      adminId: req.params.adminId
    }).limit(4);

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
