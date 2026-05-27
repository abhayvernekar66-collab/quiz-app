USE quiz_app;

SELECT 
    (SELECT COUNT(*) FROM students) as students,
    (SELECT COUNT(*) FROM subjects) as subjects,
    (SELECT COUNT(*) FROM questions) as questions;