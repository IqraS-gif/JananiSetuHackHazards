const mongoose = require('mongoose');

const AssessmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['vision', 'general', 'combined', 'contrast', 'acuity', 'amsler', 'peripheral'] // Expanded types
    },
    data: {
        type: mongoose.Schema.Types.Mixed, // Flexible for different test results
        required: true
    },
    riskScore: {
        type: Number
    },
    riskLevel: {
        type: String,
        enum: ['Low', 'Moderate', 'High', 'Critical']
    },
    mlAnalysis: {
        type: mongoose.Schema.Types.Mixed // Response from ML service
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Assessment', AssessmentSchema);
