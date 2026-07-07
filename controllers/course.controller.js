const mongoose = require('mongoose');
const User = require('../models/user.model');

const createCourse = async (req, res) => {
    try {
        console.log("COURSE DATA:", req.body);
        console.log("CREATED BY:", req.user);

        const { title, description, duration, videoUrl, month } = req.body;

        // Validation
        if (!title || !description  || !duration || !videoUrl || !month) {
            console.log("ERROR: Missing fields in course creation");
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const course = await Course.create({
            title,
            description,            
            duration,
            videoUrl,
            month
        });

        console.log("SUCCESS: Course created -", title);
        res.status(201).json({
            success: true,
            message: "Course created successfully",
            course
        });
    } catch (error) {
        console.log("ERROR: Course creation failed -", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getCourses = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        console.log("USER ENROLLMENT:", user.enrolledMonth);

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

        console.log("TOTAL COURSES:", securedCourses.length);
        res.status(200).json({
            success: true,
            message: "Courses fetched successfully",
            totalCourses: securedCourses.length,
            courses: securedCourses
        });
    } catch (error) {
        console.log("ERROR: Failed to fetch courses -", error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getVideoUrl = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        let courses;
        if (user.enrolledMonth === "1" || user.enrolledMonth === "1 month") {
            courses = await Course.find({ duration: "1" }).sort({ createdAt: 1 });
        } else if (user.enrolledMonth === "2" || user.enrolledMonth === "2 month" || user.enrolledMonth === "2 months") {
            courses = await Course.find({ duration: { $in: ["1", "2"] } }).sort({ createdAt: 1 });
        } else {
            courses = [];
        }

        const courseIndex = courses.findIndex(c => c._id.toString() === id);
        if (courseIndex === -1) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        const accessTime = new Date(user.approvedAt || user.createdAt).getTime();
        const unlockTime = accessTime + courseIndex * 12 * 60 * 60 * 1000;
        const isLocked = Date.now() < unlockTime;

        if (isLocked) {
            return res.status(403).json({
                success: false,
                message: `This video is locked. It will be available on ${new Date(unlockTime).toISOString()}`
            });
        }

        const course = courses[courseIndex];
        res.status(200).json({
            success: true,
            videoUrl: course.videoUrl
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const trackProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Ensure watchedVideos stores ObjectIds and avoid duplicates
        const videoIdObj = mongoose.Types.ObjectId(id);
        const alreadyWatched = user.watchedVideos.some((v) => v.equals(videoIdObj));
        if (!alreadyWatched) {
            user.watchedVideos.push(videoIdObj);
            await user.save();
        }

        res.status(200).json({
            success: true,
            message: 'Progress tracked successfully',
            progressCount: user.watchedVideos.length
        });
    } catch (error) {
        console.error("TRACK PROGRESS ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createCourse,
    getCourses,
    getVideoUrl,
    trackProgress
};
