// Authentication logic - simple and easy to understand
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// Login function
const login = async (req, res) => {
    try {
        const { usn, password } = req.body;

        // Check if USN and password provided
        if (!usn || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide USN and password' 
            });
        }

        // Find student by USN
        const [students] = await db.query(
            'SELECT * FROM students WHERE usn = ?',
            [usn]
        );

        // Check if student exists
        if (students.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid USN or password' 
            });
        }

        const student = students[0];

        // Check password
        const isPasswordValid = await bcrypt.compare(password, student.password);

        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid USN or password' 
            });
        }

        // Create JWT token
        const token = jwt.sign(
            { 
                id: student.id, 
                usn: student.usn, 
                name: student.name,
                role: 'student'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' } // Token valid for 24 hours
        );

        // Send success response
        res.status(200).json({
            success: true,
            message: 'Login successful!',
            token,
            student: {
                id: student.id,
                usn: student.usn,
                name: student.name,
                role: 'student'
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
};

// Teacher login function
const teacherLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if username and password provided
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide username and password' 
            });
        }

        // Find teacher by username
        const [teachers] = await db.query(
            'SELECT * FROM teachers WHERE username = ?',
            [username]
        );

        // Check if teacher exists
        if (teachers.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }

        const teacher = teachers[0];

        // Check password
        const isPasswordValid = await bcrypt.compare(password, teacher.password);

        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }

        // Create JWT token
        const token = jwt.sign(
            { 
                id: teacher.id, 
                username: teacher.username, 
                name: teacher.name,
                role: 'teacher'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' } // Token valid for 24 hours
        );

        // Send success response
        res.status(200).json({
            success: true,
            message: 'Teacher login successful!',
            token,
            teacher: {
                id: teacher.id,
                username: teacher.username,
                name: teacher.name,
                role: 'teacher'
            }
        });

    } catch (error) {
        console.error('Teacher login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during teacher login' 
        });
    }
};

// Register student function
const registerStudent = async (req, res) => {
    try {
        const { usn, name, password } = req.body;

        if (!usn || !name || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Validate USN (should be 3 digits)
        if (!/^\d{3}$/.test(usn)) {
            return res.status(400).json({ 
                success: false, 
                message: 'USN must be a 3-digit number (e.g. 001)' 
            });
        }

        // Check if student with USN already exists
        const [existing] = await db.query(
            'SELECT id FROM students WHERE usn = ?',
            [usn]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Student with this USN already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new student
        await db.query(
            'INSERT INTO students (usn, name, password) VALUES (?, ?, ?)',
            [usn, name, hashedPassword]
        );

        res.status(201).json({
            success: true,
            message: 'Student registered successfully!'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during student registration' 
        });
    }
};

// Change password function (requires authenticated student/teacher)
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide both old and new passwords' 
            });
        }

        // Determine table based on role
        const tableName = userRole === 'teacher' ? 'teachers' : 'students';

        // Fetch user
        const [users] = await db.query(
            `SELECT * FROM ${tableName} WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        const user = users[0];

        // Verify old password
        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Incorrect old password' 
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update database
        await db.query(
            `UPDATE ${tableName} SET password = ? WHERE id = ?`,
            [hashedPassword, userId]
        );

        res.status(200).json({
            success: true,
            message: 'Password changed successfully!'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during password update' 
        });
    }
};

module.exports = { login, teacherLogin, registerStudent, changePassword };
