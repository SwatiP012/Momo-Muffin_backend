require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path"); // Import path module

// Import routes
const authRoutes = require("./routes/auth/auth-routes");
const adminRoutes = require("./routes/admin/admin-routes");
const shopRoutes = require("./routes/shop/shop-routes");
const testRoutes = require("./routes/test-routes");
const superAdminRoutes = require("./routes/superadmin/superadmin-routes");
const uploadRoutes = require("./routes/upload");
//const shopProductsRouter = require("./routes/shop/products-routes");
const productRoutes = require('./routes/shop/productRoutes');
const cartRoutes = require('./routes/shop/cart-routes');
const addressRoutes = require('./routes/shop/address-routes');
const orderRoutes = require('./routes/shop/order-routes');
const reviewRoutes = require('./routes/shop/review-routes');
const adminOrderRoutes = require("./routes/admin/order-routes");
const customerRoutes = require("./routes/admin/customer-routes") // Add this at the top with other requires

// Database connection with reconnection and fallback
const connectDB = async () => {
  try {
    // Remove deprecated options and add SSL options
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      ssl: true
    };

    // Use environment variable for MongoDB Atlas cluster connection
    const mongoURI = process.env.MONGO_URI;
    try {
      await mongoose.connect(mongoURI, options);
      console.log("MongoDB Atlas cluster connected successfully");
    } catch (firstError) {
      console.error("Primary connection failed, trying fallback connection:", firstError.message);

      // Try fallback with different options
      const fallbackOptions = {
        tls: true,
        tlsInsecure: true // Only use this temporarily for debugging
      };
      await mongoose.connect(mongoURI, fallbackOptions);
      console.log("MongoDB Atlas connected using fallback connection");
    }
  } catch (error) {
    console.error("All MongoDB connection attempts failed:", error);
    console.log("Attempting to reconnect in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

// Set up MongoDB connection listeners with Atlas-specific error handling
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected, attempting to reconnect...");
  setTimeout(connectDB, 3000);
});

// Improve error handling for MongoDB Atlas specific errors
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);

  // Handle Atlas specific errors
  if (err.message && err.message.includes('ssl')) {
    console.error("SSL/TLS Error connecting to MongoDB Atlas. Check your Network/Firewall settings.");
  }

  // Try to reconnect
  setTimeout(connectDB, 3000);
});

// Start the database connection
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://swatip012.github.io"], // Allow both localhost and IP
    methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS", "PATCH"], // Add OPTIONS for preflight requests
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Expires",
      "Pragma",
      "X-Requested-With", // Add this header
    ],
    credentials: true, // Important for cookies
    maxAge: 86400, // Cache preflight requests for 24 hours
  })
);

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use('/api/shop/products', productRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/test", testRoutes);
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/stores", require("./routes/admin/store-routes"));
app.use("/api/shop/stores", require("./routes/shop/store-routes"));
app.use('/api/shop/cart', cartRoutes);
app.use('/api/shop/address', addressRoutes);
app.use('/api/shop/order', orderRoutes);
app.use('/api/shop/reviews', reviewRoutes);
app.use("/api", require("./routes/shop/store-product-routes"));
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin", customerRoutes); // Add this line for customer routes




// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
    server: "MERN E-Commerce API",
    cookies: req.cookies,
  });
});

// Test ping endpoint
app.get("/api/test/ping", (req, res) => {
  res.json({
    success: true,
    message: "Server is working",
    timestamp: new Date().toISOString(),
  });
});

// Test OTP verification endpoint
app.post("/api/test/verify-otp", (req, res) => {
  const { userId, otp } = req.body;
  console.log("Test OTP verification request:", { userId, otp });

  if (!userId || !otp) {
    return res.status(400).json({
      success: false,
      message: "User ID and OTP are required",
    });
  }
  // This is a test endpoint that always succeeds
  return res.status(200).json({
    success: true,
    message: "OTP verified successfully (test endpoint)",
  });
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// aproved stores
// app.get("/api/approved-stores", async (req, res) => {
//   try {
//     const approvedStores = await User.find({ adminVerified: true });
//     res.status(200).json({
//       success: true,
//       stores: approvedStores,
//     });
//   } catch (error) {
//     console.error("Error fetching approved stores:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });

// Start server with port conflict handling
const startServer = () => {
  const server = app.listen(PORT, () => {
    console.log(`Server is now running on port ${PORT}`);
    console.log("Environment variables loaded:");
    console.log("JWT_SECRET:", process.env.JWT_SECRET ? "[Set]" : "[Not Set]");
    console.log(
      "TWILIO_ACCOUNT_SID:",
      process.env.TWILIO_ACCOUNT_SID ? "[Set]" : "[Not Set]"
    );
    console.log(
      "TWILIO_AUTH_TOKEN:",
      process.env.TWILIO_AUTH_TOKEN ? "[Set]" : "[Not Set]"
    );
    console.log(
      "TWILIO_PHONE_NUMBER:",
      process.env.TWILIO_PHONE_NUMBER ? "[Set]" : "[Not Set]"
    );
  }).on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
  const newPort = PORT + 1;
  app.listen(newPort, () => {
    console.log(`Server is now running on port ${ newPort }`);
  });
} else {
  console.error("Server error:", err);
    }
  });
};

startServer();