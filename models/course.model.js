const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    description: {
        type: String,
        
        trim: true
    },
    teacherName: {
        type: String,
      
        trim: true
    },
    languageMedium: {
        type: String,
        
        trim: true
    },
    duration: {
        type: String,
        required: [true, 'Duration is required'],
        trim: true
    },
    videoUrl: {
        type: String,
        required: [true, 'Video URL is required'],
        trim: true
    },
    month: {
        type: Number,
        required: [true, 'Month is required']
    }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
