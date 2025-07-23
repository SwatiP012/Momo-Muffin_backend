// filepath: server/routes/admin/store-routes.js
const express = require("express");
const router = express.Router();
const { getApprovedStores, getAllStores } = require("../../controllers/admin/store-controller");

router.get("/approved", getApprovedStores);
router.get("/stores", getAllStores);

module.exports = router;