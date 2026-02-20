const express = require('express');
const router = express.Router();
const Assessment = require('../models/Assessment');
const auth = require('../middleware/auth');
const { calculateRisk } = require('../utils/riskAssessment');
const axios = require('axios');

// @route   POST /api/assessments
// @desc    Create a new assessment
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { type, data } = req.body;

        // 1. Rule-based scoring (Primary/Fallback)
        const { score, level } = calculateRisk({ ...data, testType: type });

        // 2. ML Analysis (Optional/Secondary)
        let mlAnalysis = null;
        try {
            const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';

            // Map individual test data to ML features
            const mlFeatures = {
                age: 50, // Default median
                familyHistory: 0, // Default no history
                logMAR: 0.1, // Default normal
                logCS: 1.6, // Default normal
                vfi: 100, // Default perfect
                amslerDistortion: 0 // Default none
            };

            // Override with actual test data
            if (type === 'acuity') mlFeatures.logMAR = parseFloat(data.score || 0.1);
            if (type === 'contrast') mlFeatures.logCS = parseFloat(data.score || 1.6);
            if (type === 'peripheral') mlFeatures.vfi = parseFloat(data.score || 100);
            if (type === 'amsler') mlFeatures.amslerDistortion = (data.hasDistortion || (data.markedCells && data.markedCells.length > 0)) ? 1 : 0;

            const mlRes = await axios.post(`${mlUrl}/predict`, mlFeatures);
            mlAnalysis = mlRes.data;
            console.log(`✓ ML Analysis successful for ${type}`);
        } catch (mlErr) {
            console.error(`❌ ML Service connection failed (${mlUrl}):`, mlErr.message);
        }

        const assessment = await Assessment.create({
            user: req.user.id,
            type,
            data,
            riskScore: score,
            riskLevel: level,
            mlAnalysis
        });

        res.status(201).json(assessment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/assessments
// @desc    Get all assessments for current user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const assessments = await Assessment.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(assessments);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// @route   GET /api/assessments/:id
// @desc    Get single assessment
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);

        if (assessment && assessment.user.toString() === req.user.id.toString()) {
            res.json(assessment);
        } else {
            res.status(404).json({ message: 'Assessment not found or not authorized' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
