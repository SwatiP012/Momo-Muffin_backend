const User = require("../../models/User");

exports.getCustomers = async (req, res) => {
    try {
        const customers = await User.find({ role: "user" }).select("-password -otp -otpExpiry");
        res.json({ customers });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};