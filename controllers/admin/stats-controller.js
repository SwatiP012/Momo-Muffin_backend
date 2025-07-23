const Product = require("../../models/Product");
const Order = require("../../models/Order");
const User = require("../../models/User");

/**
 * Get dashboard statistics for admin
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Check if user has admin role
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access"
      });
    }

    // Admin ID for filtering
    const adminId = req.user._id;

    // For admins, only show their products
    const productsQuery = req.user.role === 'admin' ? { adminId } : {};

    // Get all products for this admin
    const products = await Product.find(productsQuery);
    const productIds = products.map(product => product._id);

    // Orders query for this admin's products
    const ordersQuery = req.user.role === 'admin'
      ? { "cartItems.productId": { $in: productIds } }
      : {};

    // Get orders
    const orders = await Order.find(ordersQuery)
      .sort({ orderDate: -1 })
      .populate('userId', 'userName email')
      .populate('cartItems.productId');

    // Calculate various metrics

    // 1. Total products
    const totalProducts = products.length;

    // 2. Low stock products (less than 5 items)
    const lowStockProducts = products.filter(p => p.totalStock <= 5).length;

    // 3. Order stats
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => order.orderStatus === 'pending').length;
    const processingOrders = orders.filter(order => ['processing', 'shipped'].includes(order.orderStatus)).length;
    const completedOrders = orders.filter(order => order.orderStatus === 'delivered').length;

    // 4. Calculate revenue - for admin's products only
    let totalRevenue = 0;

    orders
      .filter(order => order.orderStatus === 'confirmed')
      .forEach(order => {
        if (req.user.role === 'admin') {
          order.cartItems.forEach(item => {
            if (
              item.productId &&
              productIds.map(id => id.toString()).includes(
                item.productId._id ? item.productId._id.toString() : item.productId.toString()
              )
            ) {
              totalRevenue += Number(item.price) * Number(item.quantity);
            }
          });
        } else {
          order.cartItems.forEach(item => {
            totalRevenue += Number(item.price) * Number(item.quantity);
          });
        }
      });

    // 5. Top selling products
    const productSales = {};

    // Count how many times each product was sold
    orders.forEach(order => {
      order.cartItems.forEach(item => {
        const productId = item.productId && item.productId._id ? item.productId._id.toString() : item.productId.toString();

        // Skip if not this admin's product
        if (req.user.role === 'admin' && !productIds.map(id => id.toString()).includes(productId)) {
          return;
        }

        if (!productSales[productId]) {
          productSales[productId] = {
            _id: productId,
            title: item.title,
            price: item.price,
            image: item.productId.image,
            totalStock: item.productId.totalStock,
            soldCount: 0
          };
        }

        productSales[productId].soldCount += item.quantity;
      });
    });

    // Convert to array and sort by soldCount
    const topSellingProducts = Object.values(productSales)
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 5);

    // 6. Recent orders (last 5)
    // ...existing code...

    // 6. Recent orders (last 5)
    const recentOrders = orders.slice(0, 5).map(order => {
      let filteredCartItems = order.cartItems;
      let totalAmount = order.totalAmount;

      if (req.user.role === 'admin') {
        filteredCartItems = order.cartItems.filter(item =>
          productIds.map(id => id.toString()).includes(
            item.productId && item.productId._id
              ? item.productId._id.toString()
              : item.productId.toString()
          )
        );
        totalAmount = filteredCartItems.reduce(
          (sum, item) => sum + Number(item.price) * Number(item.quantity),
          0
        );
      }

      return {
        _id: order._id,
        orderDate: order.orderDate,
        orderStatus: order.orderStatus,
        totalAmount,
        userName: order.userId?.userName || 'Anonymous',
      };
    });

    // ...existing code...

    // 7. Sales by category
    const salesByCategory = {};

    orders.forEach(order => {
      order.cartItems.forEach(item => {
        const productId = item.productId && item.productId._id ? item.productId._id.toString() : item.productId.toString();
        // Skip if not this admin's product
        if (req.user.role === 'admin' && !productIds.map(id => id.toString()).includes(productId)) {
          return;
        }

        const category = item.productId.category;
        if (!category) return;

        if (!salesByCategory[category]) {
          salesByCategory[category] = 0;
        }

        salesByCategory[category] += Number(item.price) * Number(item.quantity);
      });
    });

    // 8. Last 7 days sales
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      // Get orders for this day
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= date && orderDate < nextDay;
      });

      // Calculate total sales for this day
      let dayAmount = 0;

      dayOrders.forEach(order => {
        order.cartItems.forEach(item => {
          const productId = item.productId && item.productId._id ? item.productId._id.toString() : item.productId.toString();
          if (req.user.role === 'admin' && !productIds.map(id => id.toString()).includes(productId)) {
            return;
          }
          dayAmount += Number(item.price) * Number(item.quantity);
        });
      });

      // Format date as dd/mm
      const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;

      last7Days.push({
        date: formattedDate,
        amount: dayAmount
      });
    }

    // Return complete stats object
    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        lowStockProducts,
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        totalRevenue,
        topSellingProducts,
        recentOrders,
        salesByCategory,
        last7DaysSales: last7Days
      }
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics"
    });
  }
};

/**
 * Get inventory status for admin
 */
exports.getInventoryStatus = async (req, res) => {
  try {
    // Admin ID for filtering
    const adminId = req.user._id;

    // For admins, only show their products
    const productsQuery = req.user.role === 'admin' ? { adminId } : {};

    // Get all products for this admin
    const products = await Product.find(productsQuery).sort({ totalStock: 1 });

    // Calculate inventory status
    const lowStock = products.filter(p => p.totalStock <= 5);
    const outOfStock = products.filter(p => p.totalStock === 0);
    const healthyStock = products.filter(p => p.totalStock > 5);

    res.status(200).json({
      success: true,
      data: {
        lowStock,
        outOfStock,
        healthyStock,
        totalProducts: products.length
      }
    });
  } catch (error) {
    console.error("Error fetching inventory status:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inventory status"
    });
  }
};

/**
 * Get business insights for admin
 */
exports.getBusinessInsights = async (req, res) => {
  try {
    // Admin ID for filtering
    const adminId = req.user._id;

    // For admins, only show their products
    const productsQuery = req.user.role === 'admin' ? { adminId } : {};

    // Get all products for this admin
    const products = await Product.find(productsQuery);
    const productIds = products.map(product => product._id);

    // Orders query for this admin's products
    const ordersQuery = req.user.role === 'admin'
      ? { "cartItems.productId": { $in: productIds } }
      : {};

    // Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

    // Get orders by date ranges
    const todayOrders = await Order.find({
      ...ordersQuery,
      orderDate: { $gte: today }
    });

    const yesterdayOrders = await Order.find({
      ...ordersQuery,
      orderDate: { $gte: yesterday, $lt: today }
    });

    const thisWeekOrders = await Order.find({
      ...ordersQuery,
      orderDate: { $gte: startOfWeek }
    });

    const lastWeekOrders = await Order.find({
      ...ordersQuery,
      orderDate: { $gte: startOfLastWeek, $lt: startOfWeek }
    });

    const thisMonthOrders = await Order.find({
      ...ordersQuery,
      orderDate: { $gte: startOfMonth }
    });

    const lastMonthOrders = await Order.find({
      ...ordersQuery,
      orderDate: { $gte: startOfLastMonth, $lt: startOfMonth }
    });

    // Calculate revenue for each period
    const calculateRevenue = (orders) => {
      let revenue = 0;

      orders.forEach(order => {
        order.cartItems.forEach(item => {
          const productId = item.productId && item.productId._id ? item.productId._id.toString() : item.productId.toString();
          if (req.user.role === 'admin' && !productIds.map(id => id.toString()).includes(productId)) {
            return;
          }
          revenue += Number(item.price) * Number(item.quantity);
        });
      });

      return revenue;
    };

    // Prepare insights object
    const insights = {
      today: {
        orders: todayOrders.length,
        revenue: calculateRevenue(todayOrders)
      },
      yesterday: {
        orders: yesterdayOrders.length,
        revenue: calculateRevenue(yesterdayOrders)
      },
      thisWeek: {
        orders: thisWeekOrders.length,
        revenue: calculateRevenue(thisWeekOrders)
      },
      lastWeek: {
        orders: lastWeekOrders.length,
        revenue: calculateRevenue(lastWeekOrders)
      },
      thisMonth: {
        orders: thisMonthOrders.length,
        revenue: calculateRevenue(thisMonthOrders)
      },
      lastMonth: {
        orders: lastMonthOrders.length,
        revenue: calculateRevenue(lastMonthOrders)
      }
    };

    // Calculate growth rates
    insights.dailyGrowth = insights.yesterday.revenue > 0
      ? ((insights.today.revenue - insights.yesterday.revenue) / insights.yesterday.revenue) * 100
      : 0;

    insights.weeklyGrowth = insights.lastWeek.revenue > 0
      ? ((insights.thisWeek.revenue - insights.lastWeek.revenue) / insights.lastWeek.revenue) * 100
      : 0;

    insights.monthlyGrowth = insights.lastMonth.revenue > 0
      ? ((insights.thisMonth.revenue - insights.lastMonth.revenue) / insights.lastMonth.revenue) * 100
      : 0;

    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error("Error fetching business insights:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching business insights"
    });
  }
};