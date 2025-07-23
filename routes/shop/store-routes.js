const express = require("express");
const router = express.Router();
const { getApprovedStores } = require("../../controllers/admin/store-controller");

// Public route to get approved stores
router.get("/approved", getApprovedStores);

module.exports = router; 