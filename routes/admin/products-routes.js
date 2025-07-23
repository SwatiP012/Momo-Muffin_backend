const express = require("express");
const {
  addProduct,
  editProduct,
  deleteProduct,
  fetchAllProducts,
} = require("../../controllers/admin/products-controller");
const Product = require("../../models/Product");

const router = express.Router();

// Get all products
router.get("/get", fetchAllProducts);

// Add a new product
router.post("/add", addProduct);

// Edit a product
router.put("/edit/:id", editProduct);

// Delete a product
router.delete("/delete/:id", deleteProduct);

router.patch("/:id/feature", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    product.featured = !!req.body.featured;
    await product.save();

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update featured status" });
  }
});


module.exports = router;
