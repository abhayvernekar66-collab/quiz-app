// Quiz operations - get subjects, get questions, submit quiz
const db = require('../config/db');

// Get all subjects
const getSubjects = async (req, res) => {
    try {
        const [subjects] = await db.query('SELECT * FROM subjects');
        
        res.status(200).json({
            success: true,
            subjects
        });
    } catch (error) {
        console.error('Get subjects error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching subjects' 
        });
    }
};

// Get questions for a subject
const getQuestions = async (req, res) => {
    try {
        const { subjectId } = req.params;
        
        // Get subject config
        const [subjects] = await db.query(
            'SELECT * FROM subjects WHERE id = ?',
            [subjectId]
        );

        if (subjects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }

        const subject = subjects[0];
        const limit = subject.question_count || 10;

        // Get random questions for the subject based on custom limit
        const [questions] = await db.query(
            `SELECT id, question_text, option_a, option_b, option_c, option_d FROM questions WHERE subject_id = ? ORDER BY RAND() LIMIT ${limit}`,
            [subjectId]
        );

        res.status(200).json({
            success: true,
            questions,
            timeLimitMinutes: subject.time_limit_minutes || 15,
            questionCount: limit
        });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching questions' 
        });
    }
};

// Submit quiz and calculate score
const submitQuiz = async (req, res) => {
    try {
        const { subjectId, answers, warningsCount } = req.body;
        const studentId = req.user.id;
        const finalWarnings = warningsCount || 0;

        // Fetch subject details to determine expected question count
        const [subjects] = await db.query('SELECT question_count FROM subjects WHERE id = ?', [subjectId]);
        const limit = (subjects.length > 0 && subjects[0].question_count) ? subjects[0].question_count : 10;

        const questionIds = Object.keys(answers || {});
        let score = 0;

        if (questionIds.length > 0) {
            const [questions] = await db.query(
                `SELECT id, correct_answer FROM questions WHERE id IN (${questionIds.map(id => parseInt(id)).join(',')})` 
            );
            questions.forEach(question => {
                if (answers[question.id] === question.correct_answer) {
                    score++;
                }
            });
        }

        // Get total questions (configured limit or actual database question count, whichever is smaller)
        const [[{ count: dbQuestionCount }]] = await db.query('SELECT COUNT(*) as count FROM questions WHERE subject_id = ?', [subjectId]);
        const totalQuestions = Math.min(limit, dbQuestionCount) || 10;

        const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

        // Save result to database
        await db.query(
            'INSERT INTO quiz_results (student_id, subject_id, score, total_questions, percentage, warnings_count) VALUES (?, ?, ?, ?, ?, ?)',
            [studentId, subjectId, score, totalQuestions, percentage, finalWarnings]
        );

        res.status(200).json({
            success: true,
            message: 'Quiz submitted successfully!',
            result: {
                score,
                totalQuestions,
                percentage: percentage.toFixed(2),
                warningsCount: finalWarnings
            }
        });

    } catch (error) {
        console.error('Submit quiz error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting quiz' 
        });
    }
};

// Get student quiz history
const getQuizHistory = async (req, res) => {
    try {
        const studentId = req.user.id;

        const [results] = await db.query(
            `SELECT qr.*, s.subject_name 
             FROM quiz_results qr 
             JOIN subjects s ON qr.subject_id = s.id 
             WHERE qr.student_id = ? 
             ORDER BY qr.quiz_date DESC`,
            [studentId]
        );

        res.status(200).json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching quiz history' 
        });
    }
};

// Create a new subject (Teacher only)
const createSubject = async (req, res) => {
    try {
        const { subjectName, subjectCode, timeLimitMinutes, questionCount } = req.body;
        
        if (!subjectName || !subjectCode) {
            return res.status(400).json({
                success: false,
                message: 'Subject name and code are required'
            });
        }

        const finalTimeLimit = parseInt(timeLimitMinutes) || 15;
        const finalQuestionCount = parseInt(questionCount) || 10;

        // Insert new subject
        const [result] = await db.query(
            'INSERT INTO subjects (subject_name, subject_code, time_limit_minutes, question_count) VALUES (?, ?, ?, ?)',
            [subjectName, subjectCode, finalTimeLimit, finalQuestionCount]
        );

        res.status(201).json({
            success: true,
            message: 'Subject created successfully!',
            subject: {
                id: result.insertId,
                subject_name: subjectName,
                subject_code: subjectCode,
                time_limit_minutes: finalTimeLimit,
                question_count: finalQuestionCount
            }
        });
    } catch (error) {
        console.error('Create subject error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating subject'
        });
    }
};

// Create a new question (Teacher only)
const createQuestion = async (req, res) => {
    try {
        const { subjectId, questionText, optionA, optionB, optionC, optionD, correctAnswer } = req.body;

        if (!subjectId || !questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Insert new question
        const [result] = await db.query(
            'INSERT INTO questions (subject_id, question_text, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [subjectId, questionText, optionA, optionB, optionC, optionD, correctAnswer]
        );

        res.status(201).json({
            success: true,
            message: 'Question created successfully!',
            question: {
                id: result.insertId,
                subject_id: subjectId,
                question_text: questionText,
                option_a: optionA,
                option_b: optionB,
                option_c: optionC,
                option_d: optionD,
                correct_answer: correctAnswer
            }
        });
    } catch (error) {
        console.error('Create question error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating question'
        });
    }
};

// Edit an existing question (Teacher only)
const editQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectId, questionText, optionA, optionB, optionC, optionD, correctAnswer } = req.body;

        if (!subjectId || !questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        await db.query(
            'UPDATE questions SET subject_id = ?, question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ? WHERE id = ?',
            [subjectId, questionText, optionA, optionB, optionC, optionD, correctAnswer, id]
        );

        res.status(200).json({
            success: true,
            message: 'Question updated successfully!'
        });
    } catch (error) {
        console.error('Edit question error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating question'
        });
    }
};

// Delete a question (Teacher only)
const deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM questions WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: 'Question deleted successfully!'
        });
    } catch (error) {
        console.error('Delete question error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting question'
        });
    }
};

// Get all questions for a subject (Teacher only, unfiltered)
const getAllQuestions = async (req, res) => {
    try {
        const { subjectId } = req.params;

        const [questions] = await db.query(
            'SELECT * FROM questions WHERE subject_id = ? ORDER BY id DESC',
            [subjectId]
        );

        res.status(200).json({
            success: true,
            questions
        });
    } catch (error) {
        console.error('Get all questions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching questions'
        });
    }
};

// Get student performance data (Teacher only)
const getStudentPerformance = async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT qr.*, s.name as student_name, s.usn as student_usn, sub.subject_name 
            FROM quiz_results qr
            JOIN students s ON qr.student_id = s.id
            JOIN subjects sub ON qr.subject_id = sub.id
            ORDER BY qr.quiz_date DESC
        `);

        res.status(200).json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Get student performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching student performance data'
        });
    }
};

// Get database summary stats and chart analytics (Teacher only)
const getStats = async (req, res) => {
    try {
        const [[{ count: subjectCount }]] = await db.query('SELECT COUNT(*) as count FROM subjects');
        const [[{ count: questionCount }]] = await db.query('SELECT COUNT(*) as count FROM questions');
        const [[{ count: submissionCount }]] = await db.query('SELECT COUNT(*) as count FROM quiz_results');

        // Average scores by subject
        const [subjectAverages] = await db.query(`
            SELECT s.subject_name, AVG(qr.percentage) as avg_percentage, COUNT(qr.id) as attempt_count
            FROM quiz_results qr
            JOIN subjects s ON qr.subject_id = s.id
            GROUP BY qr.subject_id
        `);

        // Total pass/fail count (passing is >= 40%)
        const [[passFailData]] = await db.query(`
            SELECT 
                SUM(CASE WHEN qr.percentage >= 40 THEN 1 ELSE 0 END) as pass_count,
                SUM(CASE WHEN qr.percentage < 40 THEN 1 ELSE 0 END) as fail_count
            FROM quiz_results qr
        `);

        res.status(200).json({
            success: true,
            stats: {
                subjects: subjectCount,
                questions: questionCount,
                submissions: submissionCount,
                subjectAverages: subjectAverages || [],
                passCount: passFailData.pass_count || 0,
                failCount: passFailData.fail_count || 0
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stats'
        });
    }
};

// Get leaderboard for a subject
const getLeaderboard = async (req, res) => {
    try {
        const { subjectId } = req.params;

        if (!subjectId) {
            return res.status(400).json({
                success: false,
                message: 'Subject ID is required'
            });
        }

        const [leaderboard] = await db.query(`
            SELECT qr.score, qr.total_questions, qr.percentage, qr.quiz_date, s.name as student_name, s.usn as student_usn
            FROM quiz_results qr
            JOIN students s ON qr.student_id = s.id
            WHERE qr.subject_id = ?
            ORDER BY qr.percentage DESC, qr.score DESC, qr.quiz_date ASC
            LIMIT 5
        `, [subjectId]);

        res.status(200).json({
            success: true,
            leaderboard
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leaderboard'
        });
    }
};
// Delete a subject and all associated questions and quiz results (Teacher only)
const deleteSubject = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: 'Subject ID is required'
        });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Delete matching quiz results first to avoid constraint issues
        await connection.query('DELETE FROM quiz_results WHERE subject_id = ?', [id]);

        // 2. Delete matching questions
        await connection.query('DELETE FROM questions WHERE subject_id = ?', [id]);

        // 3. Delete the subject
        const [result] = await connection.query('DELETE FROM subjects WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }

        await connection.commit();
        res.status(200).json({
            success: true,
            message: 'Subject and all associated questions and student records deleted successfully!'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Delete subject error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting subject'
        });
    } finally {
        connection.release();
    }
};

module.exports = {
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
};

