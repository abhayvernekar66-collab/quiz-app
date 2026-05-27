// Teacher Portal Script - Theme, Dynamic Charting, Question Editing & Deletion, PDF Exports

// Load Theme Immediately
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
}

// Load Accent Theme Immediately
const savedAccent = localStorage.getItem('accentTheme') || 'blue';
document.body.classList.add(`theme-${savedAccent}`);

const API_URL =
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname === '10.0.2.2'
        ? (window.location.hostname === '10.0.2.2' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api')
        : 'https://quiz-app-backend-a5mp.onrender.com/api';

function getToken() {
    return localStorage.getItem('token');
}

function getTeacher() {
    const teacher = localStorage.getItem('teacher');
    return teacher ? JSON.parse(teacher) : null;
}

// Check authorization on page load
const teacherData = getTeacher();
const token = getToken();

if (!token || !teacherData || teacherData.role !== 'teacher') {
    localStorage.removeItem('token');
    localStorage.removeItem('student');
    localStorage.removeItem('teacher');
    window.location.href = 'login.html';
}

// Display teacher details
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('teacherName').textContent = teacherData.name;
    document.getElementById('teacherInfo').textContent = `${teacherData.name} (${teacherData.username})`;

    // Theme Switch Button Icon setup
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

    // Delete Subject handler
    const deleteSubjectBtn = document.getElementById('deleteSubjectBtn');
    if (deleteSubjectBtn) {
        deleteSubjectBtn.addEventListener('click', async () => {
            const selectEl = document.getElementById('previewSelectSubject');
            const subjectId = selectEl.value;
            if (!subjectId) return;

            const selectedSubject = cachedSubjects.find(s => s.id == subjectId);
            const subjectName = selectedSubject ? selectedSubject.subject_name : 'this subject';

            const warningMsg = `⚠️ DANGER: Deleting the subject "${subjectName}" will permanently remove:
- The subject entry
- All questions belonging to it
- All student quiz grades/history for this subject

This CANNOT be undone! Are you absolutely sure you want to proceed?`;

            if (!confirm(warningMsg)) return;

            try {
                const data = await teacherApiCall(`/quiz/subjects/${subjectId}`, {
                    method: 'DELETE'
                });

                if (data && data.success) {
                    showToast('Subject and all associated data deleted successfully!', 'success');
                    selectEl.value = '';
                    selectEl.dispatchEvent(new Event('change'));
                    await loadSubjects();
                    loadDashboardStats();
                } else {
                    showToast(data.message || 'Failed to delete subject', 'error');
                }
            } catch (error) {
                console.error('Delete subject error:', error);
                showToast('Error deleting subject.', 'error');
            }
        });
    }

    loadDashboardStats();
});

// Theme Switcher
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('themeToggleBtn').textContent = isDark ? '🌙' : '☀️';
    
    // Redraw charts to update text colors in dark mode if active
    if (scoresChart || passFailChart) {
        loadDashboardStats();
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

// Toast Notifications
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

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('student');
    localStorage.removeItem('teacher');
    window.location.href = 'login.html';
}

// API Call helper for teacher
async function teacherApiCall(endpoint, options = {}) {
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

    try {
        const response = await fetch(`${API_URL}${endpoint}`, finalOptions);
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }
        return await response.json();
    } catch (error) {
        console.error(`Error with API call to ${endpoint}:`, error);
        showToast('API request failed. Check server connection.', 'error');
        throw error;
    }
}

// Switch tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(`tab-content-${tabId}`).style.display = 'block';
    document.getElementById(`tab-${tabId}`).classList.add('active');

    if (tabId === 'dashboard') {
        loadDashboardStats();
    } else if (tabId === 'manage') {
        loadSubjects();
    } else if (tabId === 'performance') {
        loadStudentPerformance();
    }
}

// Global chart references
let scoresChart = null;
let passFailChart = null;

// TAB 1: Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const data = await teacherApiCall('/quiz/stats');
        if (data && data.success) {
            document.getElementById('statSubjects').textContent = data.stats.subjects;
            document.getElementById('statQuestions').textContent = data.stats.questions;
            document.getElementById('statSubmissions').textContent = data.stats.submissions;
            
            // Render academic insights
            displayQuickInsights(data.stats.subjectAverages);

            renderCharts(data.stats);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Display academic quick insights
function displayQuickInsights(subjectAverages) {
    const container = document.getElementById('insightsContainer');
    const champEl = document.getElementById('insightChamp');
    const toughestEl = document.getElementById('insightToughest');
    const activeEl = document.getElementById('insightActive');

    if (!container) return;

    if (!subjectAverages || subjectAverages.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    // 1. Subject Champion (highest avg percentage)
    let champ = subjectAverages[0];
    // 2. Toughest Challenge (lowest avg percentage)
    let toughest = subjectAverages[0];
    // 3. Most Active (highest attempt count)
    let mostActive = subjectAverages[0];

    subjectAverages.forEach(sub => {
        if (parseFloat(sub.avg_percentage) > parseFloat(champ.avg_percentage)) {
            champ = sub;
        }
        if (parseFloat(sub.avg_percentage) < parseFloat(toughest.avg_percentage)) {
            toughest = sub;
        }
        if (parseInt(sub.attempt_count) > parseInt(mostActive.attempt_count)) {
            mostActive = sub;
        }
    });

    champEl.textContent = `${champ.subject_name} (${parseFloat(champ.avg_percentage).toFixed(1)}%)`;
    toughestEl.textContent = `${toughest.subject_name} (${parseFloat(toughest.avg_percentage).toFixed(1)}%)`;
    activeEl.textContent = `${mostActive.subject_name} (${mostActive.attempt_count} attempts)`;
}

// Render dynamic charts using Chart.js
function renderCharts(stats) {
    const isDark = document.body.classList.contains('dark-theme');
    const labelColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    // 1. Average Scores Chart (Bar)
    const scoresCtx = document.getElementById('scoresChart').getContext('2d');
    if (scoresChart) scoresChart.destroy();
    
    const subjectLabels = stats.subjectAverages.map(a => a.subject_name);
    const subjectData = stats.subjectAverages.map(a => parseFloat(a.avg_percentage).toFixed(1));

    scoresChart = new Chart(scoresCtx, {
        type: 'bar',
        data: {
            labels: subjectLabels.length > 0 ? subjectLabels : ['No Data'],
            datasets: [{
                label: 'Average Score (%)',
                data: subjectData.length > 0 ? subjectData : [0],
                backgroundColor: 'rgba(59, 130, 246, 0.75)',
                borderColor: '#2563eb',
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: gridColor },
                    ticks: { color: labelColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: labelColor }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    // 2. Pass / Fail Doughnut Chart
    const passFailCtx = document.getElementById('passFailChart').getContext('2d');
    if (passFailChart) passFailChart.destroy();

    passFailChart = new Chart(passFailCtx, {
        type: 'doughnut',
        data: {
            labels: ['Pass (>= 40%)', 'Fail (< 40%)'],
            datasets: [{
                data: [stats.passCount, stats.failCount],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: isDark ? 2 : 1,
                borderColor: isDark ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: labelColor }
                }
            }
        }
    });
}

// TAB 2: Subjects & Questions Management
let cachedSubjects = [];

async function loadSubjects() {
    try {
        const data = await teacherApiCall('/quiz/subjects');
        if (data && data.success) {
            cachedSubjects = data.subjects;
            populateSubjectsDropdowns();
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

function populateSubjectsDropdowns() {
    const selectSubject = document.getElementById('selectSubject');
    const previewSelectSubject = document.getElementById('previewSelectSubject');
    
    const prevValSelect = selectSubject.value;
    const prevValPreview = previewSelectSubject.value;

    selectSubject.innerHTML = '<option value="">-- Choose Subject --</option>';
    previewSelectSubject.innerHTML = '<option value="">-- Select Subject --</option>';

    cachedSubjects.forEach(sub => {
        const optionText = `${sub.subject_name} (${sub.subject_code})`;
        
        const opt1 = document.createElement('option');
        opt1.value = sub.id;
        opt1.textContent = optionText;
        selectSubject.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = sub.id;
        opt2.textContent = optionText;
        previewSelectSubject.appendChild(opt2);
    });

    if (prevValSelect && cachedSubjects.some(s => s.id == prevValSelect)) {
        selectSubject.value = prevValSelect;
    }
    if (prevValPreview && cachedSubjects.some(s => s.id == prevValPreview)) {
        previewSelectSubject.value = prevValPreview;
    }
}

// Preview questions trigger
document.getElementById('previewSelectSubject').addEventListener('change', async function() {
    const subjectId = this.value;
    const previewList = document.getElementById('questionsPreviewList');
    const deleteBtn = document.getElementById('deleteSubjectBtn');

    if (!subjectId) {
        previewList.innerHTML = '<p class="empty-state">Select a subject above to view its questions.</p>';
        if (deleteBtn) deleteBtn.style.display = 'none';
        return;
    }

    if (deleteBtn) deleteBtn.style.display = 'inline-block';
    previewList.innerHTML = '<p class="empty-state">Loading questions...</p>';

    try {
        const data = await teacherApiCall(`/quiz/all-questions/${subjectId}`);
        if (data && data.success) {
            renderQuestionsList(data.questions);
        }
    } catch (error) {
        previewList.innerHTML = '<p class="empty-state" style="color: var(--danger-color);">Failed to load questions.</p>';
    }
});

function renderQuestionsList(questions) {
    const previewList = document.getElementById('questionsPreviewList');
    
    if (questions.length === 0) {
        previewList.innerHTML = '<p class="empty-state">No questions configured for this subject.</p>';
        return;
    }

    previewList.innerHTML = '';
    
    questions.forEach((q, index) => {
        const qCard = document.createElement('div');
        qCard.className = 'preview-question-card';
        
        // Escape single quotes for inline JS function triggers
        const escText = q.question_text.replace(/'/g, "\\'");
        const escA = q.option_a.replace(/'/g, "\\'");
        const escB = q.option_b.replace(/'/g, "\\'");
        const escC = q.option_c.replace(/'/g, "\\'");
        const escD = q.option_d.replace(/'/g, "\\'");

        qCard.innerHTML = `
            <p>Q${questions.length - index}. ${q.question_text}</p>
            <div class="preview-options">
                <div class="preview-option ${q.correct_answer === 'A' ? 'correct' : ''}">A: ${q.option_a}</div>
                <div class="preview-option ${q.correct_answer === 'B' ? 'correct' : ''}">B: ${q.option_b}</div>
                <div class="preview-option ${q.correct_answer === 'C' ? 'correct' : ''}">C: ${q.option_c}</div>
                <div class="preview-option ${q.correct_answer === 'D' ? 'correct' : ''}">D: ${q.option_d}</div>
            </div>
            <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button onclick="startEditQuestion(${q.id}, ${q.subject_id}, '${escText}', '${escA}', '${escB}', '${escC}', '${escD}', '${q.correct_answer}')" class="btn-refresh" style="padding: 5px 12px; font-size: 12px; background: var(--primary-color); border: none; color: white;">Edit</button>
                <button onclick="deleteQuestion(${q.id}, ${q.subject_id})" class="btn-logout" style="padding: 5px 12px; font-size: 12px; margin: 0;">Delete</button>
            </div>
        `;
        previewList.appendChild(qCard);
    });
}

// Question edit triggers
function startEditQuestion(id, subjectId, text, a, b, c, d, correct) {
    document.getElementById('editingQuestionId').value = id;
    document.getElementById('selectSubject').value = subjectId;
    document.getElementById('questionText').value = text;
    document.getElementById('optionA').value = a;
    document.getElementById('optionB').value = b;
    document.getElementById('optionC').value = c;
    document.getElementById('optionD').value = d;
    document.getElementById('correctAnswer').value = correct;

    document.getElementById('questionFormTitle').textContent = 'Edit Quiz Question';
    document.getElementById('questionFormSubmitBtn').textContent = 'Save Changes';
    document.getElementById('cancelEditQuestionBtn').style.display = 'block';

    // Scroll to form smoothly
    document.getElementById('createQuestionForm').scrollIntoView({ behavior: 'smooth' });
}

function cancelEditQuestion() {
    document.getElementById('editingQuestionId').value = '';
    document.getElementById('createQuestionForm').reset();

    document.getElementById('questionFormTitle').textContent = 'Add Quiz Question';
    document.getElementById('questionFormSubmitBtn').textContent = 'Add Question';
    document.getElementById('cancelEditQuestionBtn').style.display = 'none';
}

document.getElementById('cancelEditQuestionBtn').addEventListener('click', cancelEditQuestion);

// Delete question logic
async function deleteQuestion(id, subjectId) {
    if (!confirm('Are you sure you want to permanently delete this question?')) return;

    try {
        const data = await teacherApiCall(`/quiz/questions/${id}`, {
            method: 'DELETE'
        });

        if (data && data.success) {
            showToast('Question deleted successfully!', 'success');
            
            // Reload previews
            const previewDropdown = document.getElementById('previewSelectSubject');
            if (previewDropdown.value == subjectId) {
                previewDropdown.dispatchEvent(new Event('change'));
            }
            loadDashboardStats(); // update question counter
        } else {
            showToast(data.message || 'Failed to delete question', 'error');
        }
    } catch (error) {
        console.error('Delete question error:', error);
    }
}

// Form Submission: Create Subject
document.getElementById('createSubjectForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const subjectName = document.getElementById('subjectName').value.trim();
    const subjectCode = document.getElementById('subjectCode').value.trim();
    const timeLimitMinutes = document.getElementById('subjectTimeLimit').value;
    const questionCount = document.getElementById('subjectQuestionCount').value;

    if (!subjectName || !subjectCode) {
        showToast('Please fill in all subject fields', 'error');
        return;
    }

    try {
        const data = await teacherApiCall('/quiz/subjects', {
            method: 'POST',
            body: JSON.stringify({ subjectName, subjectCode, timeLimitMinutes, questionCount })
        });

        if (data && data.success) {
            showToast('Subject created successfully!', 'success');
            document.getElementById('createSubjectForm').reset();
            // Reset to defaults
            document.getElementById('subjectTimeLimit').value = 15;
            document.getElementById('subjectQuestionCount').value = 10;
            await loadSubjects(); 
            loadDashboardStats();
        } else {
            showToast(data.message || 'Failed to create subject', 'error');
        }
    } catch (error) {
        console.error('Create subject error:', error);
    }
});

// Form Submission: Create/Edit Question
document.getElementById('createQuestionForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const editingId = document.getElementById('editingQuestionId').value;
    const subjectId = document.getElementById('selectSubject').value;
    const questionText = document.getElementById('questionText').value.trim();
    const optionA = document.getElementById('optionA').value.trim();
    const optionB = document.getElementById('optionB').value.trim();
    const optionC = document.getElementById('optionC').value.trim();
    const optionD = document.getElementById('optionD').value.trim();
    const correctAnswer = document.getElementById('correctAnswer').value;

    if (!subjectId || !questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const payload = { subjectId, questionText, optionA, optionB, optionC, optionD, correctAnswer };

    try {
        let data;
        if (editingId) {
            // Edit mode
            data = await teacherApiCall(`/quiz/questions/${editingId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            // Create mode
            data = await teacherApiCall('/quiz/questions', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        if (data && data.success) {
            showToast(editingId ? 'Question updated successfully!' : 'Question added successfully!', 'success');
            
            if (editingId) cancelEditQuestion();
            else document.getElementById('createQuestionForm').reset();
            
            // Reload previews
            const previewDropdown = document.getElementById('previewSelectSubject');
            if (previewDropdown.value == subjectId) {
                previewDropdown.dispatchEvent(new Event('change'));
            }
            loadDashboardStats();
        } else {
            showToast(data.message || 'Failed to save question', 'error');
        }
    } catch (error) {
        console.error('Save question error:', error);
    }
});

// TAB 3: Load Student Performance Results
async function loadStudentPerformance() {
    const tbody = document.getElementById('performanceTableBody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Loading student results...</td></tr>';
    
    try {
        const data = await teacherApiCall('/quiz/student-results');
        if (data && data.success) {
            renderPerformanceTable(data.results);
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--danger-color);">Failed to load results.</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--danger-color);">Error fetching results.</td></tr>';
    }
}

function renderPerformanceTable(results) {
    const tbody = document.getElementById('performanceTableBody');
    
    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No student quiz attempts recorded yet.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    
    results.forEach(row => {
        const tr = document.createElement('tr');
        
        const date = new Date(row.quiz_date);
        const formattedDate = date.toLocaleString();
        
        const isPass = row.percentage >= 40.0;
        const resultBadge = isPass 
            ? '<span class="badge pass">Pass</span>' 
            : '<span class="badge fail">Fail</span>';

        const warningCount = row.warnings_count || 0;
        const warningStyle = warningCount > 0 
            ? 'color: var(--danger-color); font-weight: bold;'
            : '';

        tr.innerHTML = `
            <td>${row.student_name}</td>
            <td><strong>${row.student_usn}</strong></td>
            <td>${row.subject_name}</td>
            <td>${row.score} / ${row.total_questions}</td>
            <td>${parseFloat(row.percentage).toFixed(2)}%</td>
            <td style="${warningStyle}">${warningCount}</td>
            <td>${formattedDate}</td>
            <td>${resultBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Download Performance Table PDF (Export Landscape PDF)
function downloadAllResultsPdf() {
    const tableElement = document.getElementById('performanceTable').cloneNode(true);
    
    // Create printable envelope wrapper
    const printWrapper = document.createElement('div');
    printWrapper.style.padding = '35px';
    printWrapper.style.fontFamily = "'Segoe UI', sans-serif";
    printWrapper.style.color = '#1e293b';
    printWrapper.style.backgroundColor = '#ffffff';

    printWrapper.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #1e3c72; padding-bottom: 15px; margin-bottom: 25px;">
            <h1 style="color: #1e3c72; margin: 0; font-size: 24px; letter-spacing: 1px;">SDMCET DHARWAD</h1>
            <h2 style="color: #475569; margin: 6px 0 0; font-size: 15px; font-weight: 500;">AI & ML Department - Student Assessment Summary Report</h2>
            <p style="margin: 5px 0 0; font-size: 12px; color: #94a3b8;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
        </div>
    `;
    
    // Table configurations for clean PDF scaling
    tableElement.style.width = '100%';
    tableElement.style.borderCollapse = 'collapse';
    tableElement.style.fontSize = '12px';
    tableElement.style.marginTop = '15px';
    
    tableElement.querySelectorAll('th, td').forEach(cell => {
        cell.style.border = '1px solid #cbd5e1';
        cell.style.padding = '8px';
        cell.style.textAlign = 'left';
    });
    tableElement.querySelectorAll('th').forEach(cell => {
        cell.style.backgroundColor = '#f1f5f9';
        cell.style.color = '#000000';
    });
    tableElement.querySelectorAll('td').forEach(cell => {
        cell.style.color = '#1e293b';
    });

    printWrapper.appendChild(tableElement);

    const opt = {
        margin: 10,
        filename: `Student_Performance_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } // Landscape is ideal for horizontal tables
    };
    
    html2pdf().set(opt).from(printWrapper).save();
}
