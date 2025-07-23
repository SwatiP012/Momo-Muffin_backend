const express = require("express");
const {
  getAllOrdersOfAllUsers,
  getOrderDetailsForAdmin,
  updateOrderStatus
} = require("../../controllers/admin/order-controller");

const router = express.Router();

// Get all orders
router.get("/get", getAllOrdersOfAllUsers);

// Get order details by id
router.get("/details/:id", getOrderDetailsForAdmin);

// Update order status
router.put("/update/:id", updateOrderStatus);

module.exports = router;
