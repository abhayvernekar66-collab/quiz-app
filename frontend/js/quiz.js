// Student Quiz Interface - Theme, Anti-Cheat, Progress Tracking, PDF, Certificates

// Theme Loading
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
}

// Load Accent Theme Immediately
const savedAccent = localStorage.getItem('accentTheme') || 'blue';
document.body.classList.add(`theme-${savedAccent}`);

// Check if user is logged in
if (!isLoggedIn()) {
    window.location.href = 'login.html';
} else if (localStorage.getItem('teacher')) {
    window.location.href = 'teacher.html';
}

// Theme Toggle
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('themeToggleBtn').textContent = isDark ? '🌙' : '☀️';
}

// Get subject and student info
const currentSubject = JSON.parse(localStorage.getItem('currentSubject'));
const student = getStudent();

if (!currentSubject) {
    alert('No subject selected!');
    window.location.href = 'home.html';
}

// Display basic details
document.getElementById('subjectName').textContent = currentSubject.name;
if (student) {
    document.getElementById('studentInfo').textContent = `USN: ${student.usn} | ${student.name}`;
}

// Set Theme Icon
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
        toggleBtn.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    }
    
    // Do NOT load questions automatically. Wait for fullscreen start
    loadQuizMetaData();
});

// Quiz Variables
let questions = [];
let answers = {};
let timeLeft = 900; // Configured dynamically
let timerInterval;
let questionCountLimit = 10; // Configured dynamically
let currentQuestionIndex = 0; // State tracker for pagination

// Anti-Cheat Variables
let examStarted = false;
let warningsCount = 0;
const maxWarnings = 3;

// Toast Alert Utility
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</span>
        <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    
    // Auto remove after 3.5s
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Load metadata configurations
async function loadQuizMetaData() {
    try {
        const response = await fetch(`${API_URL}/quiz/questions/${currentSubject.id}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await response.json();
        
        if (data.success) {
            questions = data.questions;
            timeLeft = (data.timeLimitMinutes || 15) * 60;
            questionCountLimit = data.questionCount || 10;
            
            // Format timer display initially
            updateTimerDisplay();
        } else {
            document.getElementById('quizContainer').innerHTML = 
                '<p class="error">Error loading quiz metadata.</p>';
        }
    } catch (error) {
        console.error('Error fetching quiz meta:', error);
        document.getElementById('quizContainer').innerHTML = 
            '<p class="error">Connection error. Check backend server.</p>';
    }
}

// Start assessment in fullscreen
function startExamFullscreen() {
    const docEl = document.documentElement;
    
    // Request Fullscreen
    if (docEl.requestFullscreen) {
        docEl.requestFullscreen();
    } else if (docEl.mozRequestFullScreen) { // Firefox
        docEl.mozRequestFullScreen();
    } else if (docEl.webkitRequestFullscreen) { // Chrome, Safari, Opera
        docEl.webkitRequestFullscreen();
    } else if (docEl.msRequestFullscreen) { // IE/Edge
        docEl.msRequestFullscreen();
    }

    // Hide Prep Modal
    document.getElementById('prepModal').style.display = 'none';
    
    // Setup state
    examStarted = true;
    displayQuestions();
    startTimer();
    setupAntiCheatListeners();
}

// Anti-Cheat Listeners
function setupAntiCheatListeners() {
    // 1. Detect tab switching / Page visibility
    document.addEventListener('visibilitychange', handleSecurityViolation);
    
    // 2. Detect window defocus
    window.addEventListener('blur', handleSecurityViolation);
    
    // 3. Detect exit fullscreen
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && examStarted) {
            handleSecurityViolation();
        }
    });
}

function handleSecurityViolation() {
    if (!examStarted) return;
    
    warningsCount++;
    
    // Alert user
    showToast(`⚠️ SECURITY ALERT: Tab-switching, exit fullscreen, or defocus detected! Warning ${warningsCount}/${maxWarnings}`, 'error');

    // Auto submit if reached maximum warnings
    if (warningsCount >= maxWarnings) {
        clearInterval(timerInterval);
        showToast('❌ EXAM TERMINATED: Too many security violations! Auto-submitting quiz...', 'error');
        setTimeout(() => {
            autoSubmitQuiz();
        }, 1500);
    }
}

// Display current question card and navigation dots
function displayQuestions() {
    const quizContainer = document.getElementById('quizContainer');
    
    if (questions.length === 0) {
        quizContainer.innerHTML = '<p class="empty-state">No questions available for this subject.</p>';
        return;
    }

    const q = questions[currentQuestionIndex];
    const selectedOption = answers[q.id];

    // Build single question card wrapper
    const html = `
        <div class="question-card-container" id="questionCardContainer">
            <div class="question-card" id="q-card-${q.id}">
                <h3>Question ${currentQuestionIndex + 1} of ${questions.length}</h3>
                <p class="question-text">${q.question_text}</p>
                
                <div class="options">
                    <label class="option ${selectedOption === 'A' ? 'selected' : ''}" id="opt-A-${q.id}">
                        <input type="radio" name="question_${q.id}" value="A" onchange="saveAnswer(${q.id}, 'A')" ${selectedOption === 'A' ? 'checked' : ''}>
                        <span>A) ${q.option_a}</span>
                    </label>
                    <label class="option ${selectedOption === 'B' ? 'selected' : ''}" id="opt-B-${q.id}">
                        <input type="radio" name="question_${q.id}" value="B" onchange="saveAnswer(${q.id}, 'B')" ${selectedOption === 'B' ? 'checked' : ''}>
                        <span>B) ${q.option_b}</span>
                    </label>
                    <label class="option ${selectedOption === 'C' ? 'selected' : ''}" id="opt-C-${q.id}">
                        <input type="radio" name="question_${q.id}" value="C" onchange="saveAnswer(${q.id}, 'C')" ${selectedOption === 'C' ? 'checked' : ''}>
                        <span>C) ${q.option_c}</span>
                    </label>
                    <label class="option ${selectedOption === 'D' ? 'selected' : ''}" id="opt-D-${q.id}">
                        <input type="radio" name="question_${q.id}" value="D" onchange="saveAnswer(${q.id}, 'D')" ${selectedOption === 'D' ? 'checked' : ''}>
                        <span>D) ${q.option_d}</span>
                    </label>
                </div>
            </div>
        </div>
    `;

    quizContainer.innerHTML = html;
    
    // Render pagination indicators
    renderDots();

    // Show navigation container
    document.getElementById('quizNavSection').style.display = 'flex';

    // Update Pagination Buttons
    const prevBtn = document.getElementById('prevQuestionBtn');
    const nextBtn = document.getElementById('nextQuestionBtn');

    // Previous Button Visibility
    if (currentQuestionIndex === 0) {
        prevBtn.style.visibility = 'hidden';
    } else {
        prevBtn.style.visibility = 'visible';
    }

    // Next Button State (Submit on last question)
    if (currentQuestionIndex === questions.length - 1) {
        nextBtn.textContent = 'Submit Quiz';
        nextBtn.className = 'btn-submit';
        nextBtn.onclick = triggerSubmitConfirmation;
    } else {
        nextBtn.textContent = 'Next →';
        nextBtn.className = 'btn-primary';
        nextBtn.onclick = nextQuestion;
    }

    updateProgressBar();
}

// Render Q1, Q2... dots indicating status
function renderDots() {
    const dotsContainer = document.getElementById('questionDots');
    if (!dotsContainer) return;

    dotsContainer.innerHTML = '';
    questions.forEach((q, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'dot';
        dot.textContent = idx + 1;

        // Apply state classes
        if (idx === currentQuestionIndex) {
            dot.classList.add('current');
        }
        if (answers[q.id] !== undefined) {
            dot.classList.add('answered');
        }

        // Click on dot jumps directly to that question
        dot.addEventListener('click', () => {
            if (idx === currentQuestionIndex) return;
            const direction = idx > currentQuestionIndex ? 'next' : 'prev';
            navigateToQuestion(idx, direction);
        });

        dotsContainer.appendChild(dot);
    });
}

// Navigate to specific question index with Slide & Fade transition
function navigateToQuestion(targetIndex, direction) {
    const cardContainer = document.getElementById('questionCardContainer');
    if (!cardContainer) {
        currentQuestionIndex = targetIndex;
        displayQuestions();
        return;
    }

    // Apply slide-out animation class
    const outClass = direction === 'next' ? 'slide-out-left' : 'slide-out-right';
    cardContainer.classList.add(outClass);

    // Wait for slide-out transition to complete (220ms)
    setTimeout(() => {
        currentQuestionIndex = targetIndex;
        displayQuestions();

        // Get newly rendered container
        const newCard = document.getElementById('questionCardContainer');
        if (newCard) {
            const inClass = direction === 'next' ? 'slide-in-right' : 'slide-in-left';
            newCard.classList.add(inClass);
            
            // Force browser reflow to register class insertion
            newCard.offsetWidth;

            // Animate to center by removing entrance transition class
            newCard.classList.remove(inClass);
        }
    }, 220);
}

// Next Question Wrapper
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        navigateToQuestion(currentQuestionIndex + 1, 'next');
    }
}

// Previous Question Wrapper
function prevQuestion() {
    if (currentQuestionIndex > 0) {
        navigateToQuestion(currentQuestionIndex - 1, 'prev');
    }
}

// Save answers and update styling
function saveAnswer(questionId, optionLetter) {
    answers[questionId] = optionLetter;

    // Reset option styling inside card
    document.querySelectorAll(`#q-card-${questionId} .option`).forEach(opt => {
        opt.classList.remove('selected');
    });

    // Add selected styling
    const selectedLabel = document.getElementById(`opt-${optionLetter}-${questionId}`);
    if (selectedLabel) {
        selectedLabel.classList.add('selected');
    }

    renderDots();
    updateProgressBar();
}

// Progress Bar
function updateProgressBar() {
    const answeredCount = Object.keys(answers).length;
    const totalCount = questions.length;
    const percentage = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;
    
    document.getElementById('progressBar').style.width = `${percentage}%`;
}

// Timer
function startTimer() {
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        // Warning when 2 minutes left
        if (timeLeft === 120) {
            document.getElementById('timerDisplay').classList.add('warning');
            showToast('⏰ Attention: Only 2 minutes remaining!', 'warning');
        }
        
        // Time's up
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            showToast('⏰ Time is up! Submitting your quiz...', 'warning');
            setTimeout(() => {
                autoSubmitQuiz();
            }, 1000);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timerDisplay').textContent = `⏱️ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Exit attempts trigger warnings
function exitQuizAttempt() {
    if (confirm('⚠️ Warning: Exiting will submit your quiz immediately with your current progress. Do you want to exit?')) {
        autoSubmitQuiz();
    }
}

// Submit confirmations
function triggerSubmitConfirmation() {
    // Check if all questions are answered
    if (Object.keys(answers).length !== questions.length) {
        showToast(`Please answer all ${questions.length} questions before submitting!`, 'warning');
        return;
    }
    document.getElementById('confirmSubmitModal').style.display = 'flex';
}

function confirmSubmitQuiz(isConfirmed) {
    document.getElementById('confirmSubmitModal').style.display = 'none';
    if (isConfirmed) {
        handleSubmitQuiz();
    }
}

// Clean submits
async function handleSubmitQuiz() {
    clearInterval(timerInterval);
    examStarted = false;
    
    // Remove listeners
    document.removeEventListener('visibilitychange', handleSecurityViolation);
    window.removeEventListener('blur', handleSecurityViolation);
    
    // Exit Fullscreen safely
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log('Fullscreen exit error:', err));
    }

    try {
        const data = await submitQuiz(currentSubject.id, answers, warningsCount);
        if (data.success) {
            displayResult(data.result);
        } else {
            showToast('Error submitting: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error submitting quiz:', error);
        showToast('Connection error during submission.', 'error');
    }
}

// Auto submits due to violations or timer
async function autoSubmitQuiz() {
    clearInterval(timerInterval);
    examStarted = false;
    
    // Remove listeners
    document.removeEventListener('visibilitychange', handleSecurityViolation);
    window.removeEventListener('blur', handleSecurityViolation);
    
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log('Fullscreen exit error:', err));
    }

    try {
        const response = await fetch(`${API_URL}/quiz/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ subjectId: currentSubject.id, answers, warningsCount })
        });
        const data = await response.json();
        
        if (data.success) {
            displayResult(data.result);
        } else {
            showToast('Submit error: ' + data.message, 'error');
            goHome();
        }
    } catch (error) {
        console.error('Auto submission error:', error);
        goHome();
    }
}

// Score and Result Data variables to use during PDF generation
let lastScore = 0;
let lastTotal = 0;
let lastPercentage = 0;

// Display result summaries
function displayResult(result) {
    const resultContent = document.getElementById('resultContent');
    
    const passed = result.percentage >= 40.0;
    const statusText = passed ? 'PASSED' : 'FAILED';
    const statusClass = passed ? 'pass' : 'fail';
    
    lastScore = result.score;
    lastTotal = result.totalQuestions;
    lastPercentage = parseFloat(result.percentage).toFixed(2);

    resultContent.innerHTML = `
        <div class="result-summary">
            <div class="score-circle ${statusClass}">
                <h1>${result.score}/${result.totalQuestions}</h1>
            </div>
            
            <h3 class="${statusClass}">${statusText}</h3>
            <p class="percentage" style="margin-bottom: 15px;">Percentage: ${lastPercentage}%</p>
            
            <div class="result-details" style="text-align: left; background: var(--accent-bg); padding: 15px; border-radius: 8px; font-size: 14.5px;">
                <p><strong>Correct:</strong> ${result.score}</p>
                <p><strong>Incorrect:</strong> ${result.totalQuestions - result.score}</p>
                <p><strong>Cheat Warnings:</strong> <span style="${result.warningsCount > 0 ? 'color: var(--danger-color); font-weight: bold;' : ''}">${result.warningsCount}</span></p>
            </div>
        </div>
    `;

    // Handle Certificate Button visibility
    const downloadCertBtn = document.getElementById('downloadCertificateBtn');
    if (passed) {
        downloadCertBtn.style.display = 'block';
        
        // Success Confetti Explosion!
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 }
            });
        }
        
        // Hydrate certificate parameters
        document.getElementById('certStudentName').textContent = student ? student.name : 'Student';
        document.getElementById('certSubjectName').textContent = currentSubject.name;
        document.getElementById('certScore').textContent = `${result.score} / ${result.totalQuestions}`;
        document.getElementById('certPercentage').textContent = `${lastPercentage}%`;
        document.getElementById('certDate').textContent = new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Set verified QR Code pointing to Google or verification statement
        const verifyText = `VERIFIED: ${student ? student.name : 'Student'} (USN: ${student ? student.usn : 'N/A'}) passed ${currentSubject.name} with ${lastPercentage}% on ${new Date().toLocaleDateString()}`;
        document.getElementById('certQrCode').src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyText)}`;
    } else {
        downloadCertBtn.style.display = 'none';
    }

    document.getElementById('resultModal').style.display = 'flex';
}

// Download PDF Result Report
function downloadResultPdf() {
    const reportElement = document.createElement('div');
    reportElement.style.padding = '35px';
    reportElement.style.fontFamily = "'Segoe UI', sans-serif";
    reportElement.style.color = '#1e293b';
    reportElement.style.backgroundColor = '#ffffff';
    
    const warningsText = warningsCount > 0 
        ? `<span style="color: #ef4444; font-weight: bold;">${warningsCount} (Cheat warning triggered)</span>`
        : '<span style="color: #10b981; font-weight: bold;">0 (Clean attempt)</span>';

    reportElement.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #1e3c72; padding-bottom: 15px; margin-bottom: 25px;">
            <h1 style="color: #1e3c72; margin: 0; font-size: 24px; letter-spacing: 1px;">SDMCET DHARWAD</h1>
            <h2 style="color: #475569; margin: 6px 0 0; font-size: 15px; font-weight: 500;">AI & ML Department - Exam Score Report</h2>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14.5px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: 600; color: #64748b; width: 180px;">Student Name:</td>
                <td style="padding: 10px 0; font-weight: bold;">${student ? student.name : 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: 600; color: #64748b;">University Seat Number:</td>
                <td style="padding: 10px 0; font-weight: bold;">${student ? student.usn : 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Subject Course:</td>
                <td style="padding: 10px 0; font-weight: bold; color: #1e3c72;">${currentSubject.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Date Attempted:</td>
                <td style="padding: 10px 0;">${new Date().toLocaleString('en-IN')}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: 600; color: #64748b;">Security Violations:</td>
                <td style="padding: 10px 0;">${warningsText}</td>
            </tr>
        </table>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
            <h3 style="margin: 0 0 10px; color: #475569; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">Assessment Summary</h3>
            <h1 style="font-size: 54px; margin: 10px 0; color: ${lastPercentage >= 40.0 ? '#10b981' : '#ef4444'}; font-weight: 800;">${lastScore} / ${lastTotal}</h1>
            <p style="font-size: 20px; margin: 0; font-weight: 700; color: #1e293b;">Percentage: ${lastPercentage}%</p>
            <p style="font-size: 14.5px; margin: 12px 0 0; font-weight: 600; color: ${lastPercentage >= 40.0 ? '#10b981' : '#ef4444'}; text-transform: uppercase;">
                Result Status: ${lastPercentage >= 40.0 ? 'PASSED' : 'FAILED'}
            </p>
        </div>

        <div style="text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 80px;">
            This document is an official assessment record generated by the SDMCET Assessment Module.<br>
            Verification Code: SEC-${Math.floor(Math.random() * 1000000)}-${student ? student.usn : '000'}
        </div>
    `;

    const opt = {
        margin: 10,
        filename: `Result_Report_${student ? student.usn : 'Student'}_${currentSubject.name.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(reportElement).save();
}

// Certificate Modal view controllers
function openCertificateView() {
    document.getElementById('certModal').style.display = 'flex';
}

function closeCertificateView() {
    document.getElementById('certModal').style.display = 'none';
}

function downloadCertificatePdf() {
    const certElement = document.getElementById('certificateContent');
    const opt = {
        margin: 5,
        filename: `Certificate_${student ? student.name.replace(/\s+/g, '_') : 'Student'}_${currentSubject.name.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 2.5, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } // Horizontal certificate layout
    };
    
    html2pdf().set(opt).from(certElement).save();
}

function goHome() {
    clearInterval(timerInterval);
    localStorage.removeItem('currentSubject');
    window.location.href = 'home.html';
}