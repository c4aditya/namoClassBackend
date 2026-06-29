const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authMiddleware = async (req, res, next) => {
    try {
        console.log("AUTH MIDDLEWARE HIT")
        let token;

        // Check for token in cookies or Authorization header
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        console.log("TOKEN:", token);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("DECODED USER:", decoded);

        // Handle Admin from Env
        if (decoded.role === 'admin' && decoded.email === process.env.ADMIN_EMAIL) {
            req.user = { id: 'admin', email: decoded.email, role: 'admin' };
            return next();
        }

        // Handle User from DB
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - User no longer exists"
            });
        }

        req.user = {
            id: user._id,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        console.log("AUTH ERROR:", error.message);
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Invalid or expired token"
        });
    }
};

const isAdmin = (req, res, next) => {
    console.log("IS ADMIN HIT")
    if (req.user && req.user.role === "admin") {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: "Access denied - Admin only"
    });
};

const isUser = (req, res, next) => {
    if (req.user && req.user.role === "user") {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: "Access denied - User only"
    });
};

module.exports = {
    authMiddleware,
    isAdmin,
    isUser
};
