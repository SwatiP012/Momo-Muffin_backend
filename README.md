# MERN E-commerce Server

## Setup Instructions

1. **Install Dependencies**

   Run the following command to install all required dependencies:

   ```bash
   node install-dependencies.js
   ```

   This will install:
   - express-validator
   - multer-storage-cloudinary
   - cloudinary
   - multer
   - And other necessary packages

2. **Environment Configuration**

   Create a `.env` file in the server directory with the following variables:

   ```env
   JWT_SECRET=your_jwt_secret_here
   MONGO_URI=mongodb://localhost:27017/momo

   # Twilio credentials (optional)
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_phone

   # Super Admin Security Code
   SUPERADMIN_CODE=your_secure_code

   # Server settings
   PORT=5000
   NODE_ENV=development
   ```

3. **Start the Server**

   ```bash
   npm run dev
   ```

   This will start the server with nodemon for auto-reloading during development.

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - User login
- POST `/api/auth/logout` - User logout
- GET `/api/auth/check-auth` - Check authentication status

### Admin Routes
- GET `/api/admin/products/get` - Get all products
- POST `/api/admin/products/upload-image` - Upload product image
- POST `/api/admin/products/add` - Add a new product
- PUT `/api/admin/products/edit/:id` - Edit a product
- DELETE `/api/admin/products/delete/:id` - Delete a product
- GET `/api/admin/orders/get` - Get all orders
- GET `/api/admin/orders/details/:id` - Get order details
- PUT `/api/admin/orders/update/:id` - Update order status

## Fallback Mechanisms

This server includes fallback mechanisms for:
- Local file storage if Cloudinary is not configured
- Basic validation if express-validator is not available
