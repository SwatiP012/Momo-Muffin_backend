const express = require("express");
const {
  addProduct,
  getAllProducts,
  getProductDetails,
  updateProduct,
  deleteProduct,
  getFeaturedProducts
} = require("../../controllers/shop/product-controller");
const { authMiddleware } = require("../../controllers/auth/auth-controller");
const { isAdmin, isSuperAdmin } = require("../../middleware/auth-middleware");
const checkProductOwnership = require("../../middleware/product-ownership");
const mongoose = require("mongoose");
const Product = require("../../models/Product"); // Adjust the path as necessary
const Store = require("../../models/Store"); // Adjust the path as necessary

const router = express.Router();

// Public routes for product listings and details
router.get("/all", getAllProducts);
router.get('/by-admin/:adminId', async (req, res) => {
  console.log("Route hit! adminId:", req.params.adminId);
  try {
    const adminId = req.params.adminId;
    const products = await Product.find({ adminId: new mongoose.Types.ObjectId(adminId) });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error(error); // Add this for debugging
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});
router.get("/featured", getFeaturedProducts);
router.get("/:id", getProductDetails);





// Protected routes for admins
router.post("/add", authMiddleware, isAdmin, addProduct);
router.put("/update/:id", authMiddleware, isAdmin, checkProductOwnership, updateProduct);
router.delete("/delete/:id", authMiddleware, isAdmin, checkProductOwnership, deleteProduct);
// router.get("/products", getAllProducts);

// In your Express backend


// Superadmin-only routes for approving/rejecting products
//router.patch("/approve/:id", authMiddleware, isSuperAdmin, approveProduct);
//router.patch("/reject/:id", authMiddleware, isSuperAdmin, rejectProduct);

//router.get("/by-store", getProductsByStore);

module.exports = router;
