const User = require('../models/user.model');
const AllowedUser = require('../models/allowedUser.model');
const Course = require('../models/course.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (res, payload) => {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return token;
};

const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log("ERROR: User already exists -", email);
            return res.status(400).json({ 
                success: false,
                message: 'User already exists' 
            });
        }

        // Check if email is pre-approved by admin
        const allowedUser = await AllowedUser.findOne({ email });
        console.log("ALLOWED USER CHECK:", allowedUser);
        console.log("SIGNUP EMAIL:", email);

        if (!allowedUser) {
            console.log("ERROR: Email not pre-approved -", email);
            return res.status(403).json({
                success: false,
                message: "You are not allowed to signup. Contact admin."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            status: 'pending'
        });

        const responseData = {
            success: true,
            message: 'Registration successful. Please wait for admin approval.',
            user: { id: user._id, name: user.name, email: user.email, status: user.status, role: user.role }
        };

        console.log("SUCCESS: User signed up -", email);
        res.status(201).json(responseData);
    } catch (error) {
        console.log("ERROR: Signup failed -", error.message);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            console.log("ERROR: Invalid login attempt -", email);
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        if (user.status !== 'approved') {
            console.log("ERROR: Pending user login attempt -", email);
            return res.status(403).json({ 
                success: false,
                message: 'Wait for admin approval' 
            });
        }

        const token = generateToken(res, { userId: user._id, role: user.role });

        // Fetch courses based on user enrollment duration
        let courses;
        if (user.enrolledMonth === "1" || user.enrolledMonth === "1 month") {
            courses = await Course.find({ duration: "1" }).sort({ createdAt: 1 });
        } else if (user.enrolledMonth === "2" || user.enrolledMonth === "2 month" || user.enrolledMonth === "2 months") {
            courses = await Course.find({ duration: { $in: ["1", "2"] } }).sort({ createdAt: 1 });
        } else {
            courses = [];
        }

        const accessTime = new Date(user.approvedAt || user.createdAt).getTime();
        const securedCourses = courses.map((course, index) => {
            const unlockTime = accessTime + index * 12 * 60 * 60 * 1000;
            const isLocked = Date.now() < unlockTime;
            const courseObj = course.toObject();
            if (isLocked) {
                courseObj.videoUrl = "";
                courseObj.isLocked = true;
                courseObj.unlockTime = unlockTime;
            } else {
                courseObj.isLocked = false;
                courseObj.unlockTime = unlockTime;
            }
            return courseObj;
        });

        const responseData = {
            success: true,
            message: 'Login successful',
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role, 
                status: user.status,
                enrolledMonth: user.enrolledMonth,
                approvedAt: user.approvedAt || user.createdAt
            },
            totalCourses: securedCourses.length,
            courses: securedCourses,
            token
        };

        console.log("USER LOGIN:", user.email);
        console.log("ENROLLMENT:", user.enrolledMonth);
        console.log("COURSES FOUND:", courses.length);
        res.status(200).json(responseData);
    } catch (error) {
        console.log("ERROR: Login failed -", error.message);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = generateToken(res, { email, role: 'admin' });
            
            const responseData = {
                success: true,
                message: 'Admin login successful',
                user: { email, role: 'admin' },
                token
            };

            console.log("SUCCESS: Admin logged in -", email);
            return res.status(200).json(responseData);
        }

        console.log("ERROR: Invalid admin login attempt -", email);
        res.status(401).json({ 
            success: false,
            message: 'Invalid admin credentials' 
        });
    } catch (error) {
        console.log("ERROR: Admin login failed -", error.message);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const getPendingUsers = async (req, res) => {
    try {
        console.log("USER:", req.user);
        const pendingUsers = await User.find({ status: 'pending' }).select('-password');
        
        console.log("SUCCESS: Fetched pending users - Count:", pendingUsers.length);
        res.status(200).json({
            success: true,
            message: "Pending users fetched successfully",
            users: pendingUsers
        });
    } catch (error) {
        console.log("ERROR: Failed to fetch pending users -", error.message);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const approveUser = async (req, res) => {
    try {
        console.log("USER:", req.user);
        const { id } = req.params;

        // Find user first to get email
        const userToApprove = await User.findById(id);
        if (!userToApprove) {
            console.log("ERROR: User not found for approval - ID:", id);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Fetch enrolledMonth from AllowedUser collection
        const allowed = await AllowedUser.findOne({ email: userToApprove.email });
        const enrolledMonth = allowed ? allowed.enrolledMonth : "";

        const user = await User.findByIdAndUpdate(
            id, 
            { status: 'approved', enrolledMonth: enrolledMonth, approvedAt: new Date() }, 
            { new: true }
        ).select('-password');

        console.log("SUCCESS: User approved -", user.email, "Enrolled for:", user.enrolledMonth);
        res.status(200).json({ 
            success: true,
            message: 'User approved successfully', 
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                enrolledMonth: user.enrolledMonth
            }
        });
    } catch (error) {
        console.log("ERROR: Approval failed -", error.message);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    console.log("SUCCESS: Logged out");
    res.status(200).json({ 
        success: true,
        message: 'Logged out successfully' 
    });
};

const getMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Not logged in" });
        }

        // Handle Admin from Env
        if (req.user.role === 'admin') {
            return res.status(200).json({
                success: true,
                user: { email: req.user.email, role: 'admin' }
            });
        }

        // Handle regular User
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Fetch courses based on user enrollment duration
        let courses;
        if (user.enrolledMonth === "1" || user.enrolledMonth === "1 month") {
            courses = await Course.find({ duration: "1" }).sort({ createdAt: 1 });
        } else if (user.enrolledMonth === "2" || user.enrolledMonth === "2 month" || user.enrolledMonth === "2 months") {
            courses = await Course.find({ duration: { $in: ["1", "2"] } }).sort({ createdAt: 1 });
        } else {
            courses = [];
        }

        const accessTime = new Date(user.approvedAt || user.createdAt).getTime();
        const securedCourses = courses.map((course, index) => {
            const unlockTime = accessTime + index * 12 * 60 * 60 * 1000;
            const isLocked = Date.now() < unlockTime;
            const courseObj = course.toObject();
            if (isLocked) {
                courseObj.videoUrl = "";
                courseObj.isLocked = true;
                courseObj.unlockTime = unlockTime;
            } else {
                courseObj.isLocked = false;
                courseObj.unlockTime = unlockTime;
            }
            return courseObj;
        });

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                enrolledMonth: user.enrolledMonth,
                approvedAt: user.approvedAt || user.createdAt
            },
            courses: securedCourses
        });
    } catch (error) {
        console.log("GET ME ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const pendingUsers = await User.countDocuments({ status: 'pending' });
        const oneMonthUsers = await User.countDocuments({ enrolledMonth: { $in: ["1", "1 month"] }, status: 'approved' });
        const twoMonthUsers = await User.countDocuments({ enrolledMonth: { $in: ["2", "2 months", "2 month"] }, status: 'approved' });

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                pendingUsers,
                oneMonthUsers,
                twoMonthUsers
            }
        });
    } catch (error) {
        console.log("STATS ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 }).select('-password');
        const totalUsers = await User.countDocuments({});
        const totalEnrolledStudents = await User.countDocuments({ status: 'approved' });

        res.status(200).json({
            success: true,
            users,
            totalUsers,
            totalEnrolledStudents
        });
    } catch (error) {
        console.log("GET ALL USERS ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateUserDuration = async (req, res) => {
    try {
        const { id } = req.params;
        const { enrolledMonth } = req.body;

        if (!enrolledMonth) {
            return res.status(400).json({ success: false, message: 'Enrolled month is required' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.enrolledMonth = enrolledMonth;
        await user.save();

        // Also update in AllowedUser if it exists
        await AllowedUser.findOneAndUpdate({ email: user.email }, { enrolledMonth });

        res.status(200).json({
            success: true,
            message: 'User course duration updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                enrolledMonth: user.enrolledMonth
            }
        });
    } catch (error) {
        console.log("UPDATE DURATION ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Delete from User collection
        await User.findByIdAndDelete(id);

        // Delete from AllowedUser pre-approval records
        await AllowedUser.findOneAndDelete({ email: user.email });

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.log("DELETE USER ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    signup,
    login,
    adminLogin,
    getMe,
    getAdminStats,
    getPendingUsers,
    approveUser,
    logout,
    getAllUsers,
    updateUserDuration,
    deleteUser
};
