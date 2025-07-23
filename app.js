const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const shopProductsRoutes = require('./routes/shop/products-routes');
const uploadRoutes = require('./routes/upload');

// Mount routes
app.use('/api/shop/products', shopProductsRoutes);
app.use('/api/upload', uploadRoutes);

module.exports = app;