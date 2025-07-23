const Order = require("../../models/Order");
const Product = require("../../models/Product");
const Store = require("../../models/Store");

// Try to import express-validator, but handle gracefully if it's missing
let validationResult;
try {
  ({ validationResult } = require("express-validator"));
} catch (error) {
  // Define a fallback validationResult function
  validationResult = (req) => ({ 
    isEmpty: () => true,
    array: () => [] 
  });
  console.warn("express-validator not found, using fallback validation");
}

// ...existing code...

// Get all orders (filtered by admin if needed)
// ...existing code...

exports.getAllOrdersOfAllUsers = async (req, res) => {
  try {
    let query = {};
    let productIds = [];

    if (req.user.role === 'admin') {
      // 1. Find the store for this admin
      const store = await Store.findOne({ owner: req.user._id });
      if (!store) {
        return res.status(404).json({ success: false, message: "Store not found" });
      }
      // 2. Find all products for this store
      const storeProducts = await Product.find({ adminId: req.user._id }).select('_id');
      productIds = storeProducts.map(product => product._id.toString());

      // 3. Fetch all orders that contain any of those products in cartItems
      query = { "cartItems.productId": { $in: productIds } };
    }

    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .populate('userId', 'userName email phoneNumber');

    // Recalculate totalAmount for each order for this admin
    let filteredOrders = orders;
    if (req.user.role === 'admin') {
      filteredOrders = orders.map(order => {
        // Only include cartItems for this admin's products
        const filteredCartItems = order.cartItems.filter(item =>
          productIds.includes(item.productId)
        );
        // Calculate totalAmount for this admin
        const totalAmount = filteredCartItems.reduce((sum, item) =>
          sum + (Number(item.price) * Number(item.quantity)), 0
        );
        // Return a new object with updated cartItems and totalAmount
        return {
          ...order.toObject(),
          cartItems: filteredCartItems,
          totalAmount
        };
      });
    }

    res.status(200).json({
      success: true,
      data: filteredOrders
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders"
    });
  }
};
// ...existing code...
// Get detailed information about a specific order
// ...existing code...

exports.getOrderDetailsForAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('userId', 'userName email phoneNumber');
    // .populate('cartItems.productId'); // Only if productId is an ObjectId

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if admin has access to this order (if not superadmin)
    if (req.user.role === 'admin') {
      // 1. Find the store for this admin
      const store = await Store.findOne({ owner: req.user._id });
      if (!store) {
        return res.status(403).json({
          success: false,
          message: "Store not found"
        });
      }
      // 2. Find all products for this store
      const storeProducts = await Product.find({ adminId: req.user._id }).select('_id');
      const productIds = storeProducts.map(product => product._id.toString());

      // 3. Check if any order item contains this store's products
      const hasStoreProduct = order.cartItems.some(item =>
        productIds.includes(item.productId)
      );

      if (!hasStoreProduct) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this order"
        });
      }

      // 4. Filter cartItems to only include this admin's products
      order.cartItems = order.cartItems.filter(item =>
        productIds.includes(item.productId)
      );

      order.totalAmount = order.cartItems.reduce((sum, item) => {
        return sum + (Number(item.price) * Number(item.quantity));
      }, 0);
    }


    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error("Get order details error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order details"
    });
  }
};
// ...existing code...
// Update order status
// ...existing code...

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    // Validate order status
    const validStatuses = [
      'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'confirmed', 'rejected', 'inProcess', 'inShipping'
    ];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status"
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if admin has access to update this order (if not superadmin)
    if (req.user.role === 'admin') {
      const store = await Store.findOne({ owner: req.user._id });
      if (!store) {
        return res.status(403).json({
          success: false,
          message: "Store not found"
        });
      }
      const storeProducts = await Product.find({ adminId: req.user._id }).select('_id');
      const productIds = storeProducts.map(product => product._id.toString());
      const hasStoreProduct = order.cartItems.some(item =>
        productIds.includes(item.productId)
      );
      if (!hasStoreProduct) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to update this order"
        });
      }
    }

    // ENFORCE STATUS CHANGE RULES
    const currentStatus = order.orderStatus;

    // If current is pending, only allow rejected
    if (
      currentStatus === "pending" &&
      orderStatus !== "rejected"
    ) {
      return res.status(400).json({
        success: false,
        message: "Pending order can only be rejected."
      });
    }

    // If current is confirmed, allow only processing/inProcess, shipped/inShipping, delivered, or rejected
    if (
      currentStatus === "confirmed" &&
      ![ "inProcess",  "rejected"].includes(orderStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "From confirmed, you can only update to Processing or Rejected."
      });

    }

    if (currentStatus === "inProcess" && !["inShipping", "rejected"].includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "From processing, you can only update to Shipped or Rejected."
      });
    }

    if (currentStatus === "inShipping" && !["delivered", "rejected"].includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "From inShipping, you can only update to Delivered or Rejected."
      });
    }

    if (currentStatus === "delivered" && orderStatus !== "rejected") {
      return res.status(400).json({
        success: false,
        message: "From delivered, you can only update to Rejected."
      });
    }

    // If current is processing/inProcess/shipped/inShipping/delivered, only allow rejected
    // const onlyRejectStatuses = [
    //   "processing", "inProcess", "shipped", "inShipping", "delivered"
    // ];
    // if (
    //   onlyRejectStatuses.includes(currentStatus) &&
    //   orderStatus !== "rejected"
    // ) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "At this stage, only rejection is allowed."
    //   });
    // }

    // Update order status
    order.orderStatus = orderStatus;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order status"
    });
  }
};
// ...existing code...