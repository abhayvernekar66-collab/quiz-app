// Student Home Page Logic - Glassmorphic theme & premium features

// Load Theme Immediately
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
}

// Load Accent Theme Immediately
const savedAccent = localStorage.getItem('accentTheme') || 'blue';
document.body.classList.add(`theme-${savedAccent}`);

// Check if user is logged in
function isLoggedIn() {
    return !!localStorage.getItem('token');
}
if (!isLoggedIn()) {
    window.location.href = 'login.html';
} else if (localStorage.getItem('teacher')) {
    window.location.href = 'teacher.html';
}

// Self-contained API helpers to bypass cached api.js
function getToken() {
    return localStorage.getItem('token');
}

async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    const response = await fetch(`${API_URL}${endpoint}`, finalOptions);
    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('student');
        window.location.href = 'login.html';
    }
    return await response.json();
}

async function getSubjects() {
    return apiCall('/quiz/subjects');
}

async function getQuizHistory() {
    return apiCall('/quiz/history');
}

// Get student info and display
const student = getStudent();
document.addEventListener('DOMContentLoaded', () => {
    if (student) {
        document.getElementById('studentName').textContent = student.name;
        document.getElementById('studentInfo').textContent = `USN: ${student.usn} | ${student.name}`;
    }

    // Set Theme Toggle Icon
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
        toggleBtn.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    }

    // Sync Active Accent Dot
    const accentDots = document.querySelectorAll('.accent-dot');
    accentDots.forEach(dot => {
        if (dot.classList.contains(savedAccent)) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    loadSubjects();
    loadQuizHistory();
});

// Theme Toggle
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('themeToggleBtn').textContent = isDark ? '🌙' : '☀️';
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


// Toast Alert Utility
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Change Password Modal Controls
function openChangePasswordModal() {
    document.getElementById('passwordModal').style.display = 'flex';
}

function closeChangePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('changePasswordForm').reset();
}

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    if (!oldPassword || !newPassword) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('Password updated successfully!', 'success');
            closeChangePasswordModal();
        } else {
            showToast(data.message || 'Password update failed', 'error');
        }
    } catch (error) {
        console.error('Password change error:', error);
        showToast('Server connection error.', 'error');
    }
});

// Student Tab Switcher
function switchStudentTab(tabId) {
    document.querySelectorAll('.student-tab-content').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(`student-tab-content-${tabId}`).style.display = 'block';
    document.getElementById(`tab-${tabId}`).classList.add('active');

    if (tabId === 'leaderboard') {
        loadLeaderboardSubjects();
    }
}

// Load subjects for student
async function loadSubjects() {
    try {
        const data = await getSubjects();
        
        if (data.success) {
            displaySubjects(data.subjects);
        } else {
            document.getElementById('subjectsList').innerHTML = 
                '<p class="error">Error loading subjects</p>';
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
        document.getElementById('subjectsList').innerHTML = 
            '<p class="error">Connection error. Please check if server is running.</p>';
    }
}

// Display subjects as premium cards
function displaySubjects(subjects) {
    const subjectsList = document.getElementById('subjectsList');
    
    if (subjects.length === 0) {
        subjectsList.innerHTML = '<p class="empty-state">No subjects available right now.</p>';
        return;
    }

    subjectsList.innerHTML = subjects.map(subject => `
        <div class="subject-card">
            <h4>${subject.subject_name}</h4>
            <p>Code: ${subject.subject_code}</p>
            <p style="font-size: 13px; margin-bottom: 15px; color: var(--text-muted);">
                ⏱️ ${subject.time_limit_minutes || 15} Mins | ❓ ${subject.question_count || 10} Questions
            </p>
            <button class="btn-start-quiz" onclick="startQuiz(${subject.id}, '${subject.subject_name}')">
                Start Quiz
            </button>
        </div>
    `).join('');
}

// Start quiz redirection
function startQuiz(subjectId, subjectName) {
    localStorage.setItem('currentSubject', JSON.stringify({ id: subjectId, name: subjectName }));
    window.location.href = 'quiz.html';
}

// Load quiz attempts history
async function loadQuizHistory() {
    try {
        const data = await getQuizHistory();
        
        if (data.success) {
            displayQuizHistory(data.results);
        } else {
            document.getElementById('quizHistory').innerHTML = 
                '<p class="error">Error loading history</p>';
        }
    } catch (error) {
        console.error('Error loading history:', error);
        document.getElementById('quizHistory').innerHTML = 
            '<p class="error">Error loading history</p>';
    }
}

// Display quiz history as glassmorphic table
function displayQuizHistory(results) {
    const historyDiv = document.getElementById('quizHistory');
    
    if (results.length === 0) {
        historyDiv.innerHTML = '<p class="empty-state">No quiz attempts yet. Start your first quiz!</p>';
        return;
    }

    historyDiv.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Warnings</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(result => `
                    <tr>
                        <td>${result.subject_name}</td>
                        <td>${result.score} / ${result.total_questions}</td>
                        <td><strong>${result.percentage}%</strong></td>
                        <td style="${result.warnings_count > 0 ? 'color: var(--danger-color); font-weight: bold;' : ''}">${result.warnings_count}</td>
                        <td>${formatDate(result.quiz_date)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Leaderboard subjects dropdown loader
async function loadLeaderboardSubjects() {
    const select = document.getElementById('leaderboardSubjectSelect');
    const prevVal = select.value;
    select.innerHTML = '<option value="">-- Choose Subject --</option>';

    try {
        const data = await getSubjects();
        if (data && data.success) {
            data.subjects.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub.id;
                opt.textContent = `${sub.subject_name} (${sub.subject_code})`;
                select.appendChild(opt);
            });
            if (prevVal) select.value = prevVal;
        }
    } catch (error) {
        console.error('Leaderboard subjects load error:', error);
    }
}

// Leaderboard Selection Change Listener
document.getElementById('leaderboardSubjectSelect').addEventListener('change', async function() {
    const subjectId = this.value;
    const tbody = document.getElementById('leaderboardTableBody');
    if (!subjectId) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; font-style: italic;">Select a subject above to view the top performers.</td></tr>';
        return;
    }

    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading leaderboard logs...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/quiz/leaderboard/${subjectId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await response.json();
        
        if (data && data.success) {
            renderLeaderboardTable(data.leaderboard);
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger-color);">Failed to load leaderboard.</td></tr>';
        }
    } catch (error) {
        console.error('Leaderboard data load error:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger-color);">Error fetching results.</td></tr>';
    }
});

function renderLeaderboardTable(rows) {
    const tbody = document.getElementById('leaderboardTableBody');
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; font-style: italic;">No quiz submissions yet. Be the first one to take the lead!</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    rows.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        let rankBadge = index + 1;
        if (index === 0) rankBadge = '🥇';
        else if (index === 1) rankBadge = '🥈';
        else if (index === 2) rankBadge = '🥉';

        const date = new Date(row.quiz_date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        tr.innerHTML = `
            <td><strong>${rankBadge}</strong></td>
            <td>${row.student_name}</td>
            <td><strong>${row.student_usn}</strong></td>
            <td>${row.score} / ${row.total_questions}</td>
            <td>${parseFloat(row.percentage).toFixed(2)}%</td>
            <td>${date}</td>
        `;
        tbody.appendChild(tr);
    });
}
