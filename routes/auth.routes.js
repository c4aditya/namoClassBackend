const express = require('express');
const router = express.Router();
const {
    signup,
    login,
    adminLogin,
    getMe,
    getAdminStats,
    getPendingUsers,
    getApprovedPendingLoginUsers,
    approveUser,
    logout,
    getAllUsers,
    updateUserDuration,
    deleteUser,
    forgotPassword,
    resetPassword
} = require('../controllers/auth.controller');
const { addUser } = require('../controllers/allowedUser.controller');
const { authMiddleware, isAdmin } = require('../middleware/auth.middleware');

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (Shared)
router.get('/me', authMiddleware, getMe);

// Protected routes (Admin only)
router.get('/stats', authMiddleware, isAdmin, getAdminStats);
router.post('/add-user', authMiddleware, isAdmin, addUser);
router.get('/pending-users', authMiddleware, isAdmin, getPendingUsers);
router.get('/approved-pending-login', authMiddleware, isAdmin, getApprovedPendingLoginUsers);
router.put('/approve/:id', authMiddleware, isAdmin, approveUser);
router.get('/users', authMiddleware, isAdmin, getAllUsers);
router.put('/update-duration/:id', authMiddleware, isAdmin, updateUserDuration);
router.delete('/delete-user/:id', authMiddleware, isAdmin, deleteUser);

// Logout
router.post('/logout', logout);

module.exports = router;
