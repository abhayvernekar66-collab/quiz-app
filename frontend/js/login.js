// Load Theme & Accent Theme Immediately
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
}
const savedAccent = localStorage.getItem('accentTheme') || 'blue';
document.body.classList.add(`theme-${savedAccent}`);

const API_URL =
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname === '10.0.2.2'
        ? (window.location.hostname === '10.0.2.2' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api')
        : 'https://quiz-app-backend-a5mp.onrender.com/api';

// Theme Toggle
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
        toggleBtn.textContent = isDark ? '🌙' : '☀️';
    }
}

// Accent Theme Selection
function setAccent(color) {
    document.body.classList.remove('theme-blue', 'theme-purple', 'theme-yellow');
    document.body.classList.add(`theme-${color}`);
    localStorage.setItem('accentTheme', color);

    const accentDots = document.querySelectorAll('.accent-dot');
    accentDots.forEach(dot => {
        if (dot.classList.contains(color)) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Initialize Theme States on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
        toggleBtn.textContent = localStorage.getItem('theme') === 'dark' ? '🌙' : '☀️';
    }

    const currentAccent = localStorage.getItem('accentTheme') || 'blue';
    const accentDots = document.querySelectorAll('.accent-dot');
    accentDots.forEach(dot => {
        if (dot.classList.contains(currentAccent)) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
});

// Fixed showMessage function to output to specific column alerts
function showMessage(message, type, targetId = 'studentMessage') {
    const messageDiv = document.getElementById(targetId);
    if (!messageDiv) return;

    const icon = type === 'success' ? '✅' : '❌';
    messageDiv.innerHTML = `<span style="font-size: 16px; display: flex; align-items: center;">${icon}</span> <span>${message}</span>`;
    messageDiv.className = `message ${type} show`;
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 4000);
}

// Student Portal Action State
let studentAction = 'login'; // 'login' or 'register'

const studentForm = document.getElementById('studentForm');
const teacherForm = document.getElementById('teacherForm');
const nameGroup = document.getElementById('nameGroup');
const regNameInput = document.getElementById('regName');
const usnInput = document.getElementById('usn');
const usnLabel = document.getElementById('usnLabel');
const usnHelp = document.getElementById('usnHelp');
const studentSubmitBtn = document.getElementById('studentSubmitBtn');
const toggleStudentAction = document.getElementById('toggleStudentAction');
const studentFormTitle = document.getElementById('studentFormTitle');

// Toggle Student Login vs Registration
toggleStudentAction.addEventListener('click', (e) => {
    e.preventDefault();
    
    if (studentAction === 'login') {
        studentAction = 'register';
        nameGroup.style.display = 'block';
        regNameInput.required = true;
        
        studentFormTitle.textContent = 'Student Registration';
        usnLabel.textContent = 'Choose University Seat Number (USN)';
        usnInput.placeholder = 'Choose a new 3-digit USN';
        usnHelp.textContent = 'Choose a unique 3-digit numeric USN (e.g. 066)';
        
        studentSubmitBtn.textContent = 'Register Student';
        toggleStudentAction.textContent = 'Already have an account? Login here';
    } else {
        studentAction = 'login';
        nameGroup.style.display = 'none';
        regNameInput.required = false;
        regNameInput.value = '';
        
        studentFormTitle.textContent = 'Student Login';
        usnLabel.textContent = 'University Seat Number (USN)';
        usnInput.placeholder = 'Enter 3-digit USN (e.g. 001)';
        usnHelp.textContent = 'Enter 3-digit numeric seat number';
        
        studentSubmitBtn.textContent = 'Login as Student';
        toggleStudentAction.textContent = 'Need an account? Register here';
    }
});

// Auto-pad USN values
usnInput.addEventListener('blur', function() {
    let value = this.value.trim();
    if (value.length > 0 && value.length < 3 && /^\d+$/.test(value)) {
        this.value = value.padStart(3, '0');
    }
});

// Handle Student Form Submit (Login & Registration)
studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const usn = usnInput.value.trim();
    const password = document.getElementById('studentPassword').value;

    if (studentAction === 'register') {
        const name = regNameInput.value.trim();
        
        if (!name || !usn || !password) {
            showMessage('Please fill in all fields', 'error', 'studentMessage');
            return;
        }

        if (!/^\d{3}$/.test(usn)) {
            showMessage('USN must be exactly 3 digits (e.g. 070)', 'error', 'studentMessage');
            return;
        }

        try {
            studentSubmitBtn.disabled = true;
            studentSubmitBtn.textContent = 'Registering...';
            
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usn, name, password })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('Registration successful! Please login.', 'success', 'studentMessage');
                setTimeout(() => {
                    toggleStudentAction.click(); // Switch back to login state
                }, 1500);
            } else {
                showMessage(data.message || 'Registration failed', 'error', 'studentMessage');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showMessage('Connection error. Is the backend server running?', 'error', 'studentMessage');
        } finally {
            studentSubmitBtn.disabled = false;
            studentSubmitBtn.textContent = 'Register Student';
        }
    } else {
        // Login action
        if (!usn || !password) {
            showMessage('Please fill in all fields', 'error', 'studentMessage');
            return;
        }

        if (!/^\d{3}$/.test(usn)) {
            showMessage('USN must be exactly 3 digits (001-065)', 'error', 'studentMessage');
            return;
        }

        try {
            studentSubmitBtn.disabled = true;
            studentSubmitBtn.textContent = 'Logging in...';
            
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usn, password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('student', JSON.stringify(data.student));
                
                showMessage('Login successful! Redirecting...', 'success', 'studentMessage');
                
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            } else {
                showMessage(data.message || 'Login failed', 'error', 'studentMessage');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Connection error. Is the backend server running?', 'error', 'studentMessage');
        } finally {
            studentSubmitBtn.disabled = false;
            studentSubmitBtn.textContent = 'Login as Student';
        }
    }
});

// Handle Teacher Form Submit
teacherForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('teacherUsername').value.trim();
    const password = document.getElementById('teacherPassword').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!username || !password) {
        showMessage('Please fill in all fields', 'error', 'teacherMessage');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        
        const response = await fetch(`${API_URL}/auth/teacher/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('teacher', JSON.stringify(data.teacher));
            
            showMessage('Teacher login successful! Redirecting...', 'success', 'teacherMessage');
            
            setTimeout(() => {
                window.location.href = 'teacher.html';
            }, 1000);
        } else {
            showMessage(data.message || 'Login failed', 'error', 'teacherMessage');
        }
    } catch (error) {
        console.error('Teacher login error:', error);
        showMessage('Connection error. Is the backend server running?', 'error', 'teacherMessage');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login as Teacher';
    }
});