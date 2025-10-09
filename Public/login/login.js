let selectedRole = 'patient';

// Role selection functionality
document.querySelectorAll('.role-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.role-option').forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        selectedRole = this.dataset.role;
        
        // Update form action based on role
        updateFormForRole();
    });
});

// Update form based on selected role
function updateFormForRole() {
    const roleHint = document.getElementById('roleHint');
    const loginTitle = document.querySelector('.login-title');
    
    switch(selectedRole) {
        case 'admin':
            roleHint.textContent = 'Administrator access to manage the entire clinic system';
            if (loginTitle) loginTitle.textContent = 'Admin Sign In';
            break;
        case 'doctor':
            roleHint.textContent = 'Medical professional access to patient management';
            if (loginTitle) loginTitle.textContent = 'Doctor Sign In';
            break;
        case 'patient':
            roleHint.textContent = 'Patient access to book appointments and view records';
            if (loginTitle) loginTitle.textContent = 'Patient Sign In';
            break;
    }
}

// Password toggle functionality
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.password-toggle i');
    
    if (passwordInput && toggleIcon) {
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
}

// Show/hide alerts
function showAlert(type, message) {
    const alertElement = document.getElementById(type + 'Alert');
    const messageElement = document.getElementById(type + 'Message');
    
    if (!alertElement || !messageElement) return;
    
    // Hide all alerts first
    hideAlerts();
    
    // Show the specific alert
    messageElement.textContent = message;
    alertElement.style.display = 'block';
    alertElement.style.opacity = '1';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideAlert(alertElement);
    }, 5000);
}

function hideAlert(alertElement) {
    if (alertElement) {
        alertElement.style.opacity = '0';
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 500);
    }
}

function hideAlerts() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        hideAlert(alert);
    });
}

// Loading state management
function setLoading(isLoading) {
    const loginBtn = document.getElementById('loginBtn');
    const loginText = document.getElementById('loginText');
    const loginSpinner = document.getElementById('loginSpinner');
    const loginIcon = document.getElementById('loginIcon');

    if (!loginBtn || !loginText) return;

    if (isLoading) {
        loginBtn.disabled = true;
        loginText.textContent = 'Signing In...';
        if (loginSpinner) loginSpinner.style.display = 'inline-block';
        if (loginIcon) loginIcon.style.display = 'none';
        
        // Add loading class to form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.classList.add('loading');
    } else {
        loginBtn.disabled = false;
        loginText.textContent = 'Sign In';
        if (loginSpinner) loginSpinner.style.display = 'none';
        if (loginIcon) loginIcon.style.display = 'inline-block';
        
        // Remove loading class
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.classList.remove('loading');
    }
}

// Enhanced form validation
function validateForm(formData) {
    const email = formData.get('email').trim();
    const password = formData.get('password');

    // Email validation
    if (!email) {
        showAlert('error', 'Please enter your email address');
        document.getElementById('email').focus();
        return false;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showAlert('error', 'Please enter a valid email address');
        document.getElementById('email').focus();
        return false;
    }

    // Password validation
    if (!password) {
        showAlert('error', 'Please enter your password');
        document.getElementById('password').focus();
        return false;
    }

    if (password.length < 6) {
        showAlert('error', 'Password must be at least 6 characters long');
        document.getElementById('password').focus();
        return false;
    }

    return true;
}

// Enhanced login form submission
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    hideAlerts();

    const formData = new FormData(this);
    const email = formData.get('email').trim();
    const password = formData.get('password');
    
    if (!validateForm(formData)) {
        return;
    }

    setLoading(true);

    try {
        console.log('🔐 Attempting login with:', {
            email: email,
            userType: selectedRole,
            timestamp: new Date().toISOString()
        });

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password,
                userType: selectedRole
            })
        });

        const data = await response.json();
        console.log('📥 Login response:', {
            status: response.status,
            ok: response.ok,
            data: data
        });

        if (response.ok && data.sessionId) {
            // ✅ Store authentication data
            localStorage.setItem('sessionId', data.sessionId);
            localStorage.setItem('userRole', data.user.role);
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            // Store login timestamp
            localStorage.setItem('loginTime', new Date().toISOString());

            console.log('✅ Login successful, stored data:', {
                sessionId: data.sessionId,
                userRole: data.user.role,
                userId: data.user.id
            });

            // Show success message
            showAlert('success', `Welcome back, ${data.user.firstName || data.user.email}! Redirecting...`);

            // Remember me functionality
            const rememberMe = document.getElementById('rememberMe');
            if (rememberMe && rememberMe.checked) {
                localStorage.setItem('rememberEmail', email);
                localStorage.setItem('rememberRole', selectedRole);
            } else {
                localStorage.removeItem('rememberEmail');
                localStorage.removeItem('rememberRole');
            }

            // Redirect with smooth transition
            setTimeout(() => {
                redirectToDashboard(data.user.role);
            }, 1500);

        } else {
            // Handle different error types
            const errorMessage = data.error || data.message || 'Login failed. Please try again.';
            console.error('❌ Login failed:', errorMessage);
            
            showAlert('error', errorMessage);
            
            // Clear password field on failure
            document.getElementById('password').value = '';
        }
    } catch (error) {
        console.error('💥 Network error:', error);
        showAlert('error', 'Network error. Please check your connection and try again.');
    } finally {
        setLoading(false);
    }
});

// Enhanced redirect function
function redirectToDashboard(userRole) {
    const dashboardPaths = {
        'admin': '/admin-dashboard',
        'doctor': '/doctor-dashboard',
        'patient': '/patient-dashboard'
    };
    
    const dashboardPath = dashboardPaths[userRole] || '/';
    console.log('🔄 Redirecting to:', dashboardPath);
    
    window.location.href = dashboardPath;
}

// Enhanced forgot password functionality
function showForgotPassword() {
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        showAlert('error', 'Please enter your email address first');
        document.getElementById('email').focus();
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showAlert('error', 'Please enter a valid email address');
        document.getElementById('email').focus();
        return;
    }

    // Simulate password reset process
    setLoading(true);
    
    setTimeout(() => {
        setLoading(false);
        showAlert('success', `Password reset instructions have been sent to ${email}`);
        
        // Log this action
        console.log('📧 Password reset requested for:', email);
    }, 2000);
}

// Enhanced session verification
async function verifySessionAndRedirect(sessionId, userRole) {
    try {
        console.log('🔐 Verifying existing session...');
        
        const response = await fetch('/api/profile', {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (response.ok) {
            const userData = await response.json();
            console.log('✅ Session is valid for user:', userData.user);
            
            // Show welcome back message
            showAlert('success', `Welcome back, ${userData.user.firstName || userData.user.email}!`);
            
            // Redirect after short delay
            setTimeout(() => {
                redirectToDashboard(userRole);
            }, 1000);
        } else {
            console.log('❌ Session invalid, clearing storage');
            clearAuthData();
        }
    } catch (error) {
        console.error('💥 Session verification failed:', error);
        clearAuthData();
    }
}

// Enhanced clear authentication data
function clearAuthData() {
    const itemsToRemove = [
        'sessionId',
        'userRole', 
        'userData',
        'loginTime'
    ];
    
    itemsToRemove.forEach(item => {
        localStorage.removeItem(item);
    });
    
    console.log('🧹 Auth data cleared');
}

// Enhanced initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Login page initialized');
    
    // Initialize role selection
    updateFormForRole();
    
    // Load remembered credentials
    const rememberedEmail = localStorage.getItem('rememberEmail');
    const rememberedRole = localStorage.getItem('rememberRole');
    
    if (rememberedEmail) {
        document.getElementById('email').value = rememberedEmail;
        document.getElementById('rememberMe').checked = true;
    }
    
    if (rememberedRole) {
        selectedRole = rememberedRole;
        document.querySelectorAll('.role-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.role === rememberedRole);
        });
        updateFormForRole();
    }
    
    // Check for existing valid session
    const sessionId = localStorage.getItem('sessionId');
    const userRole = localStorage.getItem('userRole');
    
    console.log('🔍 Session check:', { 
        hasSession: !!sessionId, 
        userRole: userRole,
        rememberEmail: rememberedEmail 
    });
    
    if (sessionId && userRole) {
        console.log('🔄 Found existing session, verifying...');
        verifySessionAndRedirect(sessionId, userRole);
    }
    
    // Add input enhancements
    enhanceFormInteractions();
});

// Enhanced form interactions
function enhanceFormInteractions() {
    // Input focus effects
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentNode.classList.add('focused');
        });

        input.addEventListener('blur', function() {
            this.parentNode.classList.remove('focused');
        });
    });
    
    // Enter key to submit
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const focused = document.activeElement;
            if (focused && focused.form) {
                e.preventDefault();
                document.getElementById('loginForm').dispatchEvent(new Event('submit'));
            }
        }
    });
}

// Enhanced logout function
function logout() {
    const sessionId = localStorage.getItem('sessionId');
    
    if (sessionId) {
        // Attempt to call logout API
        fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId })
        })
        .catch(error => {
            console.warn('⚠️ Logout API error (non-critical):', error);
        })
        .finally(() => {
            clearAuthData();
            window.location.href = '/login';
        });
    } else {
        clearAuthData();
        window.location.href = '/login';
    }
}

// Make functions available globally
window.togglePassword = togglePassword;
window.showForgotPassword = showForgotPassword;
window.logout = logout;

// Add CSS for loading state
const style = document.createElement('style');
style.textContent = `
    .loading {
        pointer-events: none;
        opacity: 0.7;
    }
    
    .focused {
        border-color: #667eea !important;
        box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1) !important;
    }
    
    .role-option.active {
        transform: scale(1.05);
        border-color: #667eea !important;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);