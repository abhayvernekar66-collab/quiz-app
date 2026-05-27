// Script to generate students with hashed passwords
// Run this once to create students in database

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function generateStudents() {
    // Database connection
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'password', // Change this
        database: 'quiz_app'
    });

    // Password for all students: "student123"
    const password = 'student123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Hashed Password:', hashedPassword);
    console.log('Inserting 65 students...\n');

    // Insert 65 students
    for (let i = 1; i <= 65; i++) {
        const usn = String(i).padStart(3, '0'); // 001, 002, etc.
        const name = `Student ${usn}`;
        
        await connection.query(
            'INSERT INTO students (usn, name, password) VALUES (?, ?, ?)',
            [usn, name, hashedPassword]
        );
        
        console.log(`✅ Created: USN ${usn} - ${name}`);
    }

    console.log('\n🎉 All 65 students created successfully!');
    console.log('📝 Login with USN: 001 to 065');
    console.log('🔑 Password for all: student123');
    
    await connection.end();
}

generateStudents().catch(console.error);
