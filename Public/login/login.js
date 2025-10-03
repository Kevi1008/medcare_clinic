let selectedRole = 'patient';

// Role selection functionality
document.querySelectorAll('.role-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.role-option').forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        selectedRole = this.dataset.role;
    });
});

// Password toggle functionality
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.password-toggle i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Show/hide alerts
function showAlert(type, message) {
    const alertElement = document.getElementById(type + 'Alert');
    const messageElement = document.getElementById(type + 'Message');
    messageElement.textContent = message;
    alertElement.style.display = 'block';
    
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 5000);
}

function hideAlerts() {
    document.getElementById('errorAlert').style.display = 'none';
    document.getElementById('successAlert').style.display = 'none';
}

// Loading state management
function setLoading(isLoading) {
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');
    const loginSpinner = document.getElementById('loginSpinner');
    const loginIcon = document.getElementById('loginIcon');

    if (isLoading) {
        loginBtn.disabled = true;
        loginText.textContent = 'Signing In...';
        loginSpinner.style.display = 'block';
        loginIcon.style.display = 'none';
    } else {
        loginBtn.disabled = false;
        loginText.textContent = 'Sign In';
        loginSpinner.style.display = 'none';
        loginIcon.style.display = 'block';
    }
}

// Form validation
function validateForm(formData) {
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !email.includes('@')) {
        showAlert('error', 'Please enter a valid email address');
        return false;
    }

    if (!password || password.length < 6) {
        showAlert('error', 'Password must be at least 6 characters long');
        return false;
    }

    return true;
}

// Login form submission
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    hideAlerts();

    const formData = new FormData(this);
    
    if (!validateForm(formData)) {
        return;
    }

    setLoading(true);

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: formData.get('email'),
                password: formData.get('password'),
                userType: selectedRole
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Store authentication data
            localStorage.setItem('authToken', data.token || 'demo-token');
            localStorage.setItem('userRole', data.user.role);
            localStorage.setItem('userData', JSON.stringify(data.user));

            // Show success message
            showAlert('success', 'Login successful! Redirecting...');

            // Remember me functionality
            if (document.getElementById('rememberMe').checked) {
                localStorage.setItem('rememberEmail', formData.get('email'));
            } else {
                localStorage.removeItem('rememberEmail');
            }

            // Redirect based on role
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin-dashboard.html';
                } else if (data.user.role === 'doctor') {
                    window.location.href = '/doctor-dashboard.html';
                } else {
                    window.location.href = '/patient-dashboard.html';
                }
            }, 1500);

        } else {
            showAlert('error', data.error || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('error', 'Network error. Please check your connection and try again.');
    } finally {
        setLoading(false);
    }
});

// Forgot password functionality
function showForgotPassword() {
    const email = document.getElementById('email').value;
    if (!email) {
        showAlert('error', 'Please enter your email address first');
        return;
    }

    showAlert('success', 'Password reset instructions will be sent to your email shortly.');
}

// Load remembered email
document.addEventListener('DOMContentLoaded', function() {
    const rememberedEmail = localStorage.getItem('rememberEmail');
    if (rememberedEmail) {
        document.getElementById('email').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
    }

    // Check if already logged in
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    
    if (token && userRole) {
        // For demo purposes, redirect based on stored role
        setTimeout(() => {
            if (userRole === 'admin') {
                window.location.href = '/admin-dashboard.html';
            } else if (userRole === 'doctor') {
                window.location.href = '/doctor-dashboard.html';
            } else {
                window.location.href = '/patient-dashboard.html';
            }
        }, 1000);
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});

// Input animations
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentNode.style.transform = 'translateY(-3px)';
    });

    input.addEventListener('blur', function() {
        this.parentNode.style.transform = 'translateY(0)';
    });
});

// Demo login credentials info
document.addEventListener('DOMContentLoaded', function() {
    const demoInfo = document.createElement('div');
    demoInfo.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: rgba(255, 255, 255, 0.9);
        padding: 1rem;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        font-size: 0.9rem;
        max-width: 250px;
        z-index: 1000;
    `;
    demoInfo.innerHTML = `
        <strong>Demo Credentials:</strong><br>
        • Patient: Create new account<br>
        • Doctor: Register as doctor<br>
        • Admin: admin@clinic.com / admin123
    `;
    document.body.appendChild(demoInfo);
});

// In your login.js form submission, store the sessionId
localStorage.setItem('sessionId', data.sessionId);

// Add logout function
function logout() {
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
        fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId })
        });
    }
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    window.location.href = '/login';
}