// Authentication routes
const express = require('express');
const router = express.Router();
const { login, teacherLogin, registerStudent, changePassword } = require('../controllers/authController');

// Auth middleware for protected auth routes
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Please login first' 
        });
    }
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

// POST /api/auth/login (Student login)
router.post('/login', login);

// POST /api/auth/teacher/login (Teacher login)
router.post('/teacher/login', teacherLogin);

// POST /api/auth/register (Student registration)
router.post('/register', registerStudent);

// POST /api/auth/change-password (Protected password update)
router.post('/change-password', authMiddleware, changePassword);

module.exports = router;
