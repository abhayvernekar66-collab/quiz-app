// API helper functions - simple and easy to understand
const API_URL =
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname === '10.0.2.2'
        ? (window.location.hostname === '10.0.2.2' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api')
        : 'https://YOUR_BACKEND_URL.onrender.com/api'; // REPLACE with your Render Web Service URL when deployed
function getToken() {
    return localStorage.getItem('token');
}

// Get student info from localStorage
function getStudent() {
    const student = localStorage.getItem('student');
    return student ? JSON.parse(student) : null;
}

// Check if user is logged in
function isLoggedIn() {
    return !!getToken();
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('student');
    window.location.href = 'login.html';
}

// API call helper with authentication
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

    try {
        const response = await fetch(`${API_URL}${endpoint}`, finalOptions);
        const data = await response.json();
        
        // If unauthorized, redirect to login
        if (response.status === 401) {
            logout();
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Get all subjects
async function getSubjects() {
    return apiCall('/quiz/subjects');
}

// Get questions for a subject
async function getQuestions(subjectId) {
    return apiCall(`/quiz/questions/${subjectId}`);
}

// Submit quiz answers
async function submitQuiz(subjectId, answers) {
    return apiCall('/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({ subjectId, answers })
    });
}

// Get quiz history
async function getQuizHistory() {
    return apiCall('/quiz/history');
}
