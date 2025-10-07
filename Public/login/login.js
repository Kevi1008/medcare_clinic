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
        console.log('🔐 Attempting login with:', {
            email: formData.get('email'),
            userType: selectedRole
        });

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
        console.log('📥 Login response:', data);

        if (response.ok) {
            // ✅ Store authentication data - FIXED: Use sessionId instead of authToken
            if (data.sessionId) {
                localStorage.setItem('sessionId', data.sessionId);
                console.log('✅ Session ID stored:', data.sessionId);
            } else {
                console.warn('⚠️ No sessionId in response, using demo token');
                localStorage.setItem('sessionId', 'demo-session-id');
            }
            
            localStorage.setItem('userRole', data.user.role);
            localStorage.setItem('userData', JSON.stringify(data.user));

            // Debug: Verify storage
            console.log('📦 LocalStorage after login:', {
                sessionId: localStorage.getItem('sessionId'),
                userRole: localStorage.getItem('userRole'),
                userData: localStorage.getItem('userData')
            });

            // Show success message
            showAlert('success', 'Login successful! Redirecting...');

            // Remember me functionality
            if (document.getElementById('rememberMe').checked) {
                localStorage.setItem('rememberEmail', formData.get('email'));
            } else {
                localStorage.removeItem('rememberEmail');
            }

            // Redirect based on role - FIXED: Use clean URLs without .html
            setTimeout(() => {
                const dashboardPaths = {
                    'admin': '/admin-dashboard',
                    'doctor': '/doctor-dashboard',
                    'patient': '/patient-dashboard'
                };
                
                const dashboardPath = dashboardPaths[data.user.role] || '/';
                console.log('🔄 Redirecting to:', dashboardPath);
                window.location.href = dashboardPath;
            }, 1500);

        } else {
            console.error('❌ Login failed:', data.error);
            showAlert('error', data.error || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('💥 Login error:', error);
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

// Load remembered email and check existing session
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Login page loaded');
    
    // Load remembered email
    const rememberedEmail = localStorage.getItem('rememberEmail');
    if (rememberedEmail) {
        document.getElementById('email').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
    }

    // Check if already logged in - FIXED: Check sessionId instead of authToken
    const sessionId = localStorage.getItem('sessionId');
    const userRole = localStorage.getItem('userRole');
    
    console.log('🔍 Existing session check:', { sessionId, userRole });
    
    if (sessionId && userRole) {
        console.log('🔄 User already logged in, redirecting...');
        
        // Verify session with server before redirecting
        verifySessionAndRedirect(sessionId, userRole);
    }
});

// Verify session with server before auto-redirect
async function verifySessionAndRedirect(sessionId, userRole) {
    try {
        console.log('🔐 Verifying existing session...');
        
        const response = await fetch('/api/profile', {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (response.ok) {
            console.log('✅ Session is valid, redirecting...');
            
            // Redirect based on role - FIXED: Use clean URLs
            setTimeout(() => {
                const dashboardPaths = {
                    'admin': '/admin-dashboard',
                    'doctor': '/doctor-dashboard', 
                    'patient': '/patient-dashboard'
                };
                
                const dashboardPath = dashboardPaths[userRole] || '/';
                console.log('🔄 Auto-redirecting to:', dashboardPath);
                window.location.href = dashboardPath;
            }, 500);
        } else {
            console.log('❌ Session invalid, clearing storage');
            clearAuthData();
        }
    } catch (error) {
        console.error('💥 Session verification failed:', error);
        clearAuthData();
    }
}

// Clear authentication data
function clearAuthData() {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    console.log('🧹 Auth data cleared');
}

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
        • Patient: patient@demo.com / patient123<br>
        • Doctor: doctor@demo.com / doctor123<br>
        • Admin: admin@demo.com / admin123
    `;
    document.body.appendChild(demoInfo);
});

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
        }).catch(error => {
            console.error('Logout API error:', error);
        });
    }
    clearAuthData();
    window.location.href = '/login';
}

// Debug function to check current auth state
function debugAuth() {
    console.log('🔍 Current Auth State:', {
        sessionId: localStorage.getItem('sessionId'),
        userRole: localStorage.getItem('userRole'),
        userData: localStorage.getItem('userData'),
        rememberEmail: localStorage.getItem('rememberEmail')
    });
}

// Make debug function available globally
window.debugAuth = debugAuth;
window.logout = logout;

// Test function to simulate successful login (for development)
function simulateLogin(role = 'doctor') {
    localStorage.setItem('sessionId', 'demo-session-' + Date.now());
    localStorage.setItem('userRole', role);
    localStorage.setItem('userData', JSON.stringify({
        id: 'demo-id',
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com',
        role: role
    }));
    
    console.log('🎭 Simulated login as:', role);
    window.location.href = '/' + role + '-dashboard';
}

// Make simulateLogin available for testing
window.simulateLogin = simulateLogin;