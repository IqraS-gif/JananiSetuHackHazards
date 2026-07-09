require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// -- Startup Validation -------------------------------------------------------
if (!process.env.JWT_SECRET) {
    console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start.');
    process.exit(1);
}

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // TODO: restrict origin to production domain before deploy
app.use(helmet());
app.use(morgan('dev'));

// Database Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/risk-radar', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(MongoDB Connected: + conn.connection.host);
    } catch (err) {
        console.error(Error:  + err.message);
    }
};
connectDB();

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'Risk Radar API', version: '1.0.0' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/health', require('./routes/health'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(Server running on port  + PORT));
