const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  addBanner,
  getAllBanners,
  getActiveBanners,
  updateBanner,
  deleteBanner,
  uploadBannerImage
} = require("../../controllers/admin/features-controller");
const { authMiddleware } = require("../../controllers/auth/auth-controller");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Banner routes
router.post("/banners", authMiddleware, addBanner);
router.get("/banners", authMiddleware, getAllBanners);
router.get("/banners/active", getActiveBanners); // Public route for shop frontend
router.put("/banners/:id", authMiddleware, updateBanner);
router.delete("/banners/:id", authMiddleware, deleteBanner);
router.post("/upload-banner-image", authMiddleware, upload.single("banner"), uploadBannerImage);

module.exports = router;
