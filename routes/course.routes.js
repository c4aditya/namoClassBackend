const express = require('express');
const router = express.Router();
const { createCourse, getCourses, getVideoUrl, trackProgress  , pauseResumeCourses , getPauseStatus} = require('../controllers/course.controller');
const { authMiddleware, isAdmin, isUser } = require('../middleware/auth.middleware');

// Admin only route
router.post('/create-course', authMiddleware, isAdmin, createCourse);

// pause the videos 
router.patch(
    "/pause-courses",
    authMiddleware,
    isAdmin,
    pauseResumeCourses
);

router.get(
    "/pause-courses",
    authMiddleware,
    isAdmin,
    getPauseStatus
);
// User only route (Enrollment based)
router.get('/courses', authMiddleware, isUser, getCourses);

// Secure video retrieval route
router.get('/video/:id', authMiddleware, isUser, getVideoUrl);

// Video progress tracking route
router.post('/progress/:id', authMiddleware, isUser, trackProgress);

module.exports = router;
