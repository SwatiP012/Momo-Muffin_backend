const express = require("express");
const router = express.Router();
const { getCustomers } = require("../../controllers/admin/customer-controller");

router.get("/customers", getCustomers);

module.exports = router;