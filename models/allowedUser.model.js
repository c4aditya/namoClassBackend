const mongoose = require('mongoose');

const allowedUserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone is required'],
        trim: true
    },
    enrolledMonth: {
        type: String,
        required: [true, 'Enrolled month is required'],
        trim: true
    }
}, { timestamps: true });

module.exports = mongoose.model('AllowedUser', allowedUserSchema);
