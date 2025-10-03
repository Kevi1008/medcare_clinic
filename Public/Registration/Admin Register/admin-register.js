const API_BASE_URL = window.location.origin;
let currentStep = 1;
const totalSteps = 4;

// Password validation
function validatePassword() {
    const password = document.getElementById('password').value;
    const requirements = {
        length: password.length >= 6,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /\d/.test(password)
    };

    updateRequirement('lengthReq', requirements.length);
    updateRequirement('upperReq', requirements.upper);
    updateRequirement('lowerReq', requirements.lower);
    updateRequirement('numberReq', requirements.number);

    return Object.values(requirements).every(req => req);
}

function updateRequirement(id, isValid) {
    const element = document.getElementById(id);
    const icon = element.querySelector('i');
    
    if (isValid) {
        element.classList.remove('invalid');
        element.classList.add('valid');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-check');
    } else {
        element.classList.remove('valid');
        element.classList.add('invalid');
        icon.classList.remove('fa-check');
        icon.classList.add('fa-times');
    }
}

// Password input event listener
document.getElementById('password').addEventListener('input', validatePassword);

// Confirm password validation
document.getElementById('confirmPassword').addEventListener('input', function() {
    const password = document.getElementById('password').value;
    const confirmPassword = this.value;
    
    if (confirmPassword && password !== confirmPassword) {
        this.style.borderColor = '#e74c3c';
        this.setCustomValidity('Passwords do not match');
    } else {
        this.style.borderColor = '#e1e5e9';
        this.setCustomValidity('');
    }
});

// Step navigation
function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
            currentStep++;
            updateStepDisplay();
            if (currentStep === 4) {
                populateReview();
            }
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}

function updateStepDisplay() {
    // Update step indicators
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNumber < currentStep) {
            step.classList.add('completed');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
        }
    });

    // Update form steps
    document.querySelectorAll('.form-step').forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active');
        
        if (stepNumber === currentStep) {
            step.classList.add('active');
        }
    });
}

function validateCurrentStep() {
    hideAlerts();
    
    if (currentStep === 1) {
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!username || username.length < 3) {
            showAlert('error', 'Username must be at least 3 characters long');
            return false;
        }

        if (!email || !email.includes('@')) {
            showAlert('error', 'Please enter a valid email address');
            return false;
        }

        if (!validatePassword()) {
            showAlert('error', 'Password does not meet requirements');
            return false;
        }

        if (password !== confirmPassword) {
            showAlert('error', 'Passwords do not match');
            return false;
        }
    } else if (currentStep === 2) {
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const phone = document.getElementById('phone').value.trim();

        if (!firstName) {
            showAlert('error', 'First name is required');
            return false;
        }

        if (!lastName) {
            showAlert('error', 'Last name is required');
            return false;
        }

        if (!phone) {
            showAlert('error', 'Phone number is required');
            return false;
        }
    } else if (currentStep === 3) {
        const employeeId = document.getElementById('employeeId').value.trim();
        const department = document.getElementById('department').value;
        const position = document.getElementById('position').value.trim();
        const accessLevel = document.getElementById('accessLevel').value;

        if (!employeeId) {
            showAlert('error', 'Employee ID is required');
            return false;
        }

        if (!department) {
            showAlert('error', 'Department is required');
            return false;
        }

        if (!position) {
            showAlert('error', 'Position is required');
            return false;
        }

        if (!accessLevel) {
            showAlert('error', 'Access level is required');
            return false;
        }
    } else if (currentStep === 4) {
        const agreeTerms = document.getElementById('agreeTerms').checked;
        const agreeConfidentiality = document.getElementById('agreeConfidentiality').checked;
        
        if (!agreeTerms) {
            showAlert('error', 'You must agree to the Terms of Service and Privacy Policy');
            return false;
        }

        if (!agreeConfidentiality) {
            showAlert('error', 'You must agree to maintain strict confidentiality');
            return false;
        }
    }

    return true;
}

function populateReview() {
    const reviewInfo = document.getElementById('reviewInfo');
    const formData = new FormData(document.getElementById('registerForm'));
    
    // Get permissions
    const permissions = [];
    document.querySelectorAll('input[name="permissions"]:checked').forEach(checkbox => {
        permissions.push(checkbox.value);
    });

    reviewInfo.innerHTML = `
        <h4 style="color: #667eea; margin-bottom: 1rem;">Account Information</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div><strong>Username:</strong> ${formData.get('username')}</div>
            <div><strong>Email:</strong> ${formData.get('email')}</div>
        </div>
        
        <h4 style="color: #667eea; margin-bottom: 1rem;">Personal Information</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div><strong>Name:</strong> ${formData.get('firstName')} ${formData.get('lastName')}</div>
            <div><strong>Phone:</strong> ${formData.get('phone')}</div>
        </div>
        
        <h4 style="color: #667eea; margin-bottom: 1rem;">Administrative Information</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div><strong>Employee ID:</strong> ${formData.get('employeeId')}</div>
            <div><strong>Department:</strong> ${formData.get('department')}</div>
            <div><strong>Position:</strong> ${formData.get('position')}</div>
            <div><strong>Access Level:</strong> ${formData.get('accessLevel')}</div>
        </div>
        
        <h4 style="color: #667eea; margin-bottom: 1rem;">Permissions</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
            ${permissions.map(perm => `<div>• ${formatPermission(perm)}</div>`).join('')}
        </div>
    `;
}

function formatPermission(permission) {
    const permissionMap = {
        'manageUsers': 'Manage Users',
        'manageDoctors': 'Manage Doctors',
        'manageAppointments': 'Manage Appointments',
        'viewReports': 'View Reports',
        'manageSettings': 'Manage Settings',
        'manageBilling': 'Manage Billing'
    };
    return permissionMap[permission] || permission;
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
    const registerBtn = document.getElementById('registerBtn');
    const registerText = document.getElementById('registerText');
    const registerSpinner = document.getElementById('registerSpinner');
    const registerIcon = document.getElementById('registerIcon');

    if (isLoading) {
        registerBtn.disabled = true;
        registerText.textContent = 'Registering...';
        registerSpinner.style.display = 'block';
        registerIcon.style.display = 'none';
    } else {
        registerBtn.disabled = false;
        registerText.textContent = 'Register as Admin';
        registerSpinner.style.display = 'none';
        registerIcon.style.display = 'block';
    }
}

// Form submission
async function handleAdminRegistration(e) {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
        return;
    }

    setLoading(true);
    hideAlerts();

    const formData = new FormData(document.getElementById('registerForm'));
    
    // Get permissions
    const permissions = {};
    document.querySelectorAll('input[name="permissions"]').forEach(checkbox => {
        permissions[checkbox.value] = checkbox.checked;
    });

    const registrationData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        employeeId: formData.get('employeeId'),
        department: formData.get('department'),
        position: formData.get('position'),
        accessLevel: formData.get('accessLevel'),
        permissions: permissions
    };

    console.log('Attempting admin registration...', registrationData);

    try {
        const response = await fetch('http://localhost:3000/api/register/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registrationData)
        });

        console.log('Response status:', response.status);

        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            showAlert('success', 'Admin account created successfully! You can now login with your credentials.');
            
            // Store email for login page
            localStorage.setItem('registeredEmail', registrationData.email);
            
            setTimeout(() => {
                window.location.href = '/login';
            }, 3000);
        } else {
            showAlert('error', data.error || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('error', 'Cannot connect to server. Make sure the backend is running on port 3000.');
    } finally {
        setLoading(false);
    }
}

// Test server connection on page load
window.addEventListener('load', async function() {
    try {
        const response = await fetch('http://localhost:3000/api/health');
        if (response.ok) {
            console.log('✅ Server connection successful');
        }
    } catch (error) {
        console.error('❌ Cannot connect to server:', error);
        showAlert('error', 'Cannot connect to server. Make sure the backend is running on port 3000.');
    }
});

// Terms and Privacy modals
function showTerms() {
    alert('Administrator Terms of Service:\n\n1. Maintain system security and integrity\n2. Protect sensitive patient and clinic data\n3. Follow all healthcare regulations (HIPAA)\n4. Use administrative privileges responsibly\n5. Report security incidents immediately\n6. Maintain accurate user and system records');
}

function showPrivacy() {
    alert('Administrative Privacy Policy:\n\n1. All data access is logged and monitored\n2. Patient confidentiality is paramount\n3. Administrative actions are tracked\n4. Data breaches must be reported immediately\n5. You are responsible for secure password management\n6. Regular security training is required');
}

// Input animations and validations
document.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentNode.style.transform = 'translateY(-2px)';
    });

    input.addEventListener('blur', function() {
        this.parentNode.style.transform = 'translateY(0)';
    });

    // Real-time validation
    input.addEventListener('input', function() {
        if (this.checkValidity()) {
            this.style.borderColor = '#27ae60';
        } else if (this.value) {
            this.style.borderColor = '#e74c3c';
        } else {
            this.style.borderColor = '#e1e5e9';
        }
    });
});

// Add event listeners when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Password validation
    document.getElementById('password')?.addEventListener('input', validatePassword);
    
    // Confirm password validation
    document.getElementById('confirmPassword')?.addEventListener('input', function() {
        const password = document.getElementById('password').value;
        const confirmPassword = this.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.style.borderColor = '#e74c3c';
        } else {
            this.style.borderColor = '#e1e5e9';
        }
    });

    // Form submission
    document.getElementById('registerForm')?.addEventListener('submit', handleAdminRegistration);
});