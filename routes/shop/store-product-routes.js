// routes/store.js
const express = require("express");
const router = express.Router();
const Store = require("../../models/Store");
const Product = require("../../models/Product");

// GET /api/stores-with-products
router.get("/stores-with-products", async (req, res) => {
    try {
        const approvedStores = await Store.find({ status: "approved" });

        const storeWithProducts = await Promise.all(
            approvedStores.map(async (store) => {
                const products = await Product.find({ adminId: store.ownerId });
                return { ...store._doc, products };
            })
        );

        res.json(storeWithProducts);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
