// Main server file - simple and easy to understand
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Import database connection
require('./config/db');

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quiz', require('./routes/quiz'));

// Root route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Quiz App API is running!',
        version: '1.0.0',
        endpoints: {
            login: 'POST /api/auth/login',
            subjects: 'GET /api/quiz/subjects',
            questions: 'GET /api/quiz/questions/:subjectId',
            submit: 'POST /api/quiz/submit',
            history: 'GET /api/quiz/history'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Route not found' 
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║     QUIZ APPLICATION SERVER           ║
╠═══════════════════════════════════════╣
║  Status: Running                      ║
║  Port: ${PORT}                           ║
║  URL: http://localhost:${PORT}           ║
║  Environment: ${process.env.NODE_ENV || 'development'}              ║
╚═══════════════════════════════════════╝
    `);
});
