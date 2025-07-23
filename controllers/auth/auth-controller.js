const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { sendOTP } = require("../../utils/sms-service");
const { sendAuthOTP, verifyAuthOTP } = require("../../utils/otp-auth-service");
const { createNotification, notifyByRole } = require("../../utils/notification-service");
require('dotenv').config();
const Store = require("../../models/Store"); // Add this at the top


// Generate random OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

//register
const registerUser = async (req, res) => {
  const { userName, email, password, phoneNumber } = req.body;

  try {
    // Check if user already exists
    const checkUser = await User.findOne({ email });
    if (checkUser)
      return res.json({
        success: false,
        message: "User Already exists with the same email! Please try again",
      });

    // Check if phone number is already registered
    if (phoneNumber && phoneNumber.trim() !== '') {
      const phoneExists = await User.findOne({ phoneNumber });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "This phone number is already registered with another account",
        });
      }
    }

    // Hash password
    const hashPassword = await bcrypt.hash(password, 12);
    
    // Create new user - initially inactive
    const newUser = new User({
      userName,
      email,
      password: hashPassword,
      phoneNumber,
      isActive: false, // Account starts inactive until OTP verified
    });

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 minutes
    
    newUser.otp = otp;
    newUser.otpExpiry = otpExpiry;
    
    // Try to send OTP
    let otpSent = false;
    try {
      await sendOTP(phoneNumber, otp);
      console.log(`OTP sent to ${phoneNumber}: ${otp}`);
      otpSent = true;
    } catch (otpError) {
      console.error("Error sending OTP:", otpError);
      // Continue with registration even if OTP sending fails
      // In a production environment, you might want to handle this differently
    }

    await newUser.save();

    res.status(200).json({
      success: true,
      message: otpSent 
        ? "Registration started. Please verify your phone number to activate your account."
        : "Registration successful but we couldn't send the verification code. Please contact support.",
      userId: newUser._id,
      requiresVerification: true,
      phoneNumber: phoneNumber
    });
  } catch (e) {
    console.log(e);
    
    // Handle MongoDB duplicate key error
    if (e.code === 11000) {
      const field = Object.keys(e.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: field === "phoneNumber" 
          ? "Phone number already registered" 
          : "Email already registered",
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Some error occurred",
    });
  }
};

//login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("Login attempt with email:", email);
    
    // Try exact match first
    let checkUser = await User.findOne({ email });
    
    // If not found, try case-insensitive search
    if (!checkUser) {
      console.log("User not found with exact match, trying case-insensitive for:", email);
      checkUser = await User.findOne({ 
        email: { $regex: new RegExp(`^${email.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } 
      });
    }
    
    if (!checkUser) {
      console.log(`User with email ${email} not found in database`);
      return res.status(200).json({  // Changed to 200 to avoid browser default error handling
        success: false,
        message: "User doesn't exist! Please register first",
      });
    }

    console.log(`User found:`, {
      id: checkUser._id,
      email: checkUser.email,
      role: checkUser.role,
      active: checkUser.isActive
    });

    // Check if account is active
    if (!checkUser.isActive) {
      return res.status(200).json({  // Using 200 with success:false is better than error codes
        success: false,
        message: "Account not activated. Please verify your phone number first.",
        requiresVerification: true,
        userId: checkUser._id
      });
    }

    const checkPasswordMatch = await bcrypt.compare(
      password,
      checkUser.password
    );
    
    if (!checkPasswordMatch) {
      console.log("Password did not match for user:", email);
      return res.status(200).json({
        success: false,
        message: "Incorrect password! Please try again",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: checkUser._id,
        role: checkUser.role,
        email: checkUser.email,
        userName: checkUser.userName,
      },
      process.env.JWT_SECRET || "CLIENT_SECRET_KEY",
      { expiresIn: "1h" }
    );

    console.log(`Login successful for user: ${checkUser.email}, role: ${checkUser.role}`);
    
    // Set cookie with proper options - FIXED: Add SameSite option
    res.cookie("token", token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000, // 1 hour
      sameSite: 'lax'
    });
    
    // Return token in response as well (for localStorage fallback)
    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token, // Include token in response
      user: {
        id: checkUser._id,
        email: checkUser.email,
        role: checkUser.role,
        userName: checkUser.userName,
        phoneNumber: checkUser.phoneNumber,
        isPhoneVerified: checkUser.isPhoneVerified || false,
        isActive: checkUser.isActive
      },
    });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({
      success: false,
      message: "Some error occurred",
    });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    console.log("OTP verification request:", { userId, otp });

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log(`Stored OTP: ${user.otp}, Received OTP: ${otp}`);

    // Compare OTPs (convert both to string)
    if (String(user.otp) !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code"
      });
    }

    // Check if OTP expired
    if (user.otpExpiry && new Date() > user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "Verification code expired"
      });
    }

    // Activate account and mark phone as verified
    user.isPhoneVerified = true;
    user.isActive = true;
    user.otp = undefined;
    user.otpExpiry = undefined;

    await user.save();
    console.log(`User activated: ${userId}, role: ${user.role}`);

    // Determine appropriate success message based on user role
    let successMessage = "Phone verified and account activated successfully";
    if (user.role === "admin") {
      successMessage = "Store registered successfully. Your account is now pending approval from admin.";
      
      // If the user being verified is an admin, notify all superadmins
      try {
        await notifyByRole({
          role: "superadmin",
          title: "New Store Registration",
          message: `${user.userName} has registered a new store "${user.adminStore?.storeName || 'New Store'}" and is awaiting approval.`,
          type: "info",
          link: "/superadmin/admins"
        });
        console.log("Notification sent to super admins about new store registration");
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
        // Non-critical error, continue with the flow
      }
    }

    return res.status(200).json({
      success: true,
      message: successMessage,
      role: user.role
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Verification failed"
    });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
    
    if (!user.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "No phone number associated with this account"
      });
    }
    
    // Generate new OTP
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP
    let otpSent = false;
    try {
      await sendOTP(user.phoneNumber, otp);
      console.log(`New OTP sent to ${user.phoneNumber}: ${otp}`);
      otpSent = true;
    } catch (otpError) {
      console.error("Error sending OTP:", otpError);
      // Log the OTP in development mode for testing
      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({
          success: false,
          message: `Failed to send SMS but OTP is: ${otp}`,
          otpSent: otpSent
        });
      }
    } 

    return res.status(200).json({
      success: true,
      message: otpSent 
        ? "Verification code sent successfully" 
        : "Verification code generated but sending failed. Please try again or contact support.",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send verification code"
    });
  }
};

//logout
const logoutUser = (req, res) => {
  res.clearCookie("token").json({
    success: true,
    message: "Logged out successfully!",
  });
};

//auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    // Check for token in cookies
    const tokenFromCookie = req.cookies.token;
    
    // Check for token in Authorization header as fallback
    let tokenFromHeader;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      tokenFromHeader = authHeader.split(' ')[1];
    }
    
    // Use cookie token first, fall back to header token
    const token = tokenFromCookie || tokenFromHeader;
    
    if (!token) {
      console.log("No auth token found in request");
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "CLIENT_SECRET_KEY");
      
      // Log token info for debugging
      console.log(`Auth middleware: Token valid for user ${decoded.id}, role: ${decoded.role}`);
      
      // Find the user to get the most up-to-date data
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        console.log(`User not found for id: ${decoded.id}`);
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }
      
      // Set the user on the request object for route handlers to use
      req.user = user;

      // If this is specifically the /check-auth endpoint, send a response
      if (req.path === '/check-auth') {
        // Also refresh the token to extend the session
        const refreshedToken = jwt.sign(
          {
            id: user._id,
            role: user.role,
            email: user.email,
            userName: user.userName,
          },
          process.env.JWT_SECRET || "CLIENT_SECRET_KEY",
          { expiresIn: "24h" } // Extend token lifetime
        );
        
        // Set refreshed cookie
        res.cookie("token", refreshedToken, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production',
          maxAge: 86400000, // 24 hours
          sameSite: 'lax'
        });
        
        return res.status(200).json({
          success: true,
          user: {
            id: user._id,
            userName: user.userName,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            isPhoneVerified: user.isPhoneVerified,
            // Include adminStore info if it exists
            ...(user.adminStore && { adminStore: user.adminStore })
          },
        });
      }

      // Otherwise, continue to the next middleware/route handler
      next(); 
    } catch (error) {
      console.error("Token verification error:", error);
      
      // Clear the invalid token
      res.clearCookie("token");
      
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Server error in authentication",
    });
  }
};

// Add a new controller for OTP authentication process
const initiateOTPAuth = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }

    // Send OTP for authentication
    const result = await sendAuthOTP(phoneNumber);

    if (result.success) {
      return res.status(200).json({
        success: true,
        isNewUser: result.isNewUser,
        message: result.message
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error("OTP auth error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate authentication"
    });
  }
};

// Verify OTP and complete authentication
const verifyOTPAuth = async (req, res) => {
  try {
    const { phoneNumber, otp, userData } = req.body;
    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required"
      });
    }   

    // Verify OTP and authenticate/register user
    const result = await verifyAuthOTP(phoneNumber, otp, userData);
    if (result.success) {
      console.log("OTP auth successful for user:", result.user);
      
      // Find user in database to get full details including role
      const fullUserData = await User.findById(result.user.id);
      if (!fullUserData) {
        return res.status(404).json({
          success: false,
          message: "User not found after verification"
        });
      }
      
      console.log("User role from database:", fullUserData.role);
      
      // Generate JWT token with longer expiration
      const token = jwt.sign(
        {
          id: fullUserData._id,
          phoneNumber: fullUserData.phoneNumber,
          role: fullUserData.role,
          userName: fullUserData.userName,
        },
        process.env.JWT_SECRET || "CLIENT_SECRET_KEY",
        { expiresIn: "24h" }
      );

      // Set token in cookie with proper options
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400000 // 24 hours
      });
      
      // Complete user data for response
      const completeUserData = {
        id: fullUserData._id.toString(),
        phoneNumber: fullUserData.phoneNumber,
        userName: fullUserData.userName,
        role: fullUserData.role, // Ensure role is included
        email: fullUserData.email,
        isPhoneVerified: true,
        createdAt: fullUserData.createdAt
      };
      
      console.log("Sending complete user data:", completeUserData);
      
      return res.status(200).json({
        success: true,
        message: "Authentication successful",
        token: token,
        user: completeUserData
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

// Get user details by ID
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Return user data without sensitive information
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified || false,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Include adminStore info if it exists
        ...(user.adminStore && { adminStore: user.adminStore })
      }
    });
  } catch (error) {
    console.error("Error in getUserDetails:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user details"
    });
  }
};


// Add registerAdmin function
const registerAdmin = async (req, res) => {
  const { userName, email, password, phoneNumber, storeName, storeDescription } = req.body;

  try {
    console.log("Admin registration request:", { userName, email, phoneNumber, storeName });
    
    // Check if user already exists
    const checkUser = await User.findOne({ email });
    if (checkUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email! Please try again with a different email.",
      });
    }

    // Check if phone number is already registered
    if (phoneNumber && phoneNumber.trim() !== '') {
      const phoneExists = await User.findOne({ phoneNumber });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "This phone number is already registered with another account",
        });
      }
    }

    // Hash password
    const hashPassword = await bcrypt.hash(password, 12);
    
    // Create new admin user - initially inactive until OTP verified
    const newUser = new User({
      userName,
      email,
      password: hashPassword,
      phoneNumber,
      role: "admin", // Set role to admin
      isActive: false, // Account starts inactive until OTP verified
      adminVerified: false, // Requires verification by super admin
      // adminStore: {
      //   storeName: storeName || `${userName}'s Store`,
      //   storeDescription: storeDescription || "New store on MOMO-MUFFIN",
      //   createdAt: new Date()
      // }
    });

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 minutes
    
    newUser.otp = otp;
    newUser.otpExpiry = otpExpiry;
    
    // Try to send OTP
    let otpSent = false;
    try {
      await sendOTP(phoneNumber, otp);
      console.log(`OTP sent to ${phoneNumber}: ${otp}`);
      otpSent = true;
    } catch (otpError) {
      console.error("Error sending OTP:", otpError);
      // Continue with registration even if OTP sending fails
    }

    await newUser.save();
    console.log("Admin registered with ID:", newUser._id);

    const newStore = new Store({
      owner: newUser._id,
      storeName: storeName || `${userName}'s Store`,
      storeDescription: storeDescription || "New store on MOMO-MUFFIN",
      status: "pending"
    });
    await newStore.save();

    res.status(200).json({
      success: true,
      message: "Admin registration started. Please verify your phone number to activate your account.",
      userId: newUser._id,
      requiresVerification: true
    });
  } catch (e) {
    console.error("Admin registration error:", e);
    
    // Handle MongoDB duplicate key error
    if (e.code === 11000) {
      const field = Object.keys(e.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: field === "phoneNumber" 
          ? "Phone number already registered" 
          : "Email already registered",
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Some error occurred during admin registration",
    });
  }
};

// Export all controller functions
module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  authMiddleware,
  verifyOTP,
  resendOTP,
  initiateOTPAuth,
  verifyOTPAuth,
  getUserDetails,
  registerAdmin
};
