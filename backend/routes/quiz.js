// Quiz routes
const express = require('express');
const router = express.Router();
const { 
    getSubjects, 
    getQuestions, 
    submitQuiz,
    getQuizHistory,
    createSubject,
    createQuestion,
    editQuestion,
    deleteQuestion,
    getAllQuestions,
    getStudentPerformance,
    getStats,
    getLeaderboard,
    deleteSubject
} = require('../controllers/quizController');

// Middleware to check if user is logged in
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

// Middleware to restrict access to teachers only
const requireTeacher = (req, res, next) => {
    if (req.user && req.user.role === 'teacher') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied: Teacher role required'
        });
    }
};

// All quiz routes require authentication
router.use(authMiddleware);

// GET /api/quiz/subjects
router.get('/subjects', getSubjects);

// GET /api/quiz/questions/:subjectId (Student: gets 10 random questions)
router.get('/questions/:subjectId', getQuestions);

// POST /api/quiz/submit
router.post('/submit', submitQuiz);

// GET /api/quiz/history (Student: gets their own history)
router.get('/history', getQuizHistory);

// --- TEACHER ONLY ROUTES ---

// POST /api/quiz/subjects (Create a new subject)
router.post('/subjects', requireTeacher, createSubject);

// POST /api/quiz/questions (Create a new question)
router.post('/questions', requireTeacher, createQuestion);

// GET /api/quiz/all-questions/:subjectId (Get all questions for a subject)
router.get('/all-questions/:subjectId', requireTeacher, getAllQuestions);

// GET /api/quiz/student-results (Get all student test results)
router.get('/student-results', requireTeacher, getStudentPerformance);

// GET /api/quiz/stats (Get database summary stats)
router.get('/stats', requireTeacher, getStats);

// PUT /api/quiz/questions/:id (Edit a question)
router.put('/questions/:id', requireTeacher, editQuestion);

// DELETE /api/quiz/questions/:id (Delete a question)
router.delete('/questions/:id', requireTeacher, deleteQuestion);

// DELETE /api/quiz/subjects/:id (Delete a subject)
router.delete('/subjects/:id', requireTeacher, deleteSubject);

// GET /api/quiz/leaderboard/:subjectId (Get leaderboard)
router.get('/leaderboard/:subjectId', getLeaderboard);

module.exports = router;
