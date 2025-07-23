// filepath: server/controllers/store-controller.js
const Store = require("../../models/Store");
const Product = require("../../models/Product");

exports.getApprovedStores = async (req, res) => {
    try {
        const stores = await Store.find({ status: "approved" }).populate("owner", "userName");
        res.json(stores);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stores" });
    }
};

exports.getAllStores = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = status ? { status } : {};
        const stores = await Store.find(filter).populate("owner", "userName email");
        res.json(stores);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching stores" });
    }
};

// Approve a store by storeId
exports.approveStore = async (req, res) => {
    try {
        const { storeId } = req.params;
        const updatedStore = await Store.findByIdAndUpdate(
            storeId,
            { status: "approved" },
            { new: true }
        ).populate("owner", "userName email");
        if (!updatedStore) {
            return res.status(404).json({ success: false, message: "Store not found" });
        }
        res.json({ success: true, message: "Store approved", store: updatedStore });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to approve store" });
    }
};

// Reject a store by storeId
exports.rejectStore = async (req, res) => {
    try {
        const { storeId } = req.params;
        const updatedStore = await Store.findByIdAndUpdate(
            storeId,
            { status: "rejected" },
            { new: true }
        ).populate("owner", "userName email");
        if (!updatedStore) {
            return res.status(404).json({ success: false, message: "Store not found" });
        }
        res.json({ success: true, message: "Store rejected", store: updatedStore });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to reject store" });
    }
};

