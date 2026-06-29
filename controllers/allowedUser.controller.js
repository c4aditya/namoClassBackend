const AllowedUser = require('../models/allowedUser.model');

const addUser = async (req, res) => {
    try {
        const { name, email, phone, enrolledMonth } = req.body;

        if (!name || !email || !phone || !enrolledMonth) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const existingAllowed = await AllowedUser.findOne({ email });
        if (existingAllowed) {
            return res.status(400).json({
                success: false,
                message: "Email is already pre-approved"
            });
        }

        const user = await AllowedUser.create({
            name,
            email,
            phone,
            enrolledMonth
        });

        console.log("SUCCESS: Allowed user added -", email);
        res.status(201).json({
            success: true,
            message: "User added successfully",
            user
        });
    } catch (error) {
        console.log("ERROR: Failed to add allowed user -", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    addUser
};
