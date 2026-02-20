const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// @route   GET /api/health
// @desc    Check API usage and database health
// @access  Public
router.get('/', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const health = {
        status: 'UP',
        timestamp: new Date(),
        database: dbState === 1 ? 'Connected' : 'Disconnected'
    };
    res.json(health);
});

module.exports = router;
