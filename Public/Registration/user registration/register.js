// Fix the API base URL - use absolute path
const API_BASE_URL = window.location.origin;

let currentStep = 1;
const totalSteps = 3;

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
document.getElementById('confirmPassword').addEventListener('input', function () {
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
            if (currentStep === 3) {
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

        if (!firstName) {
            showAlert('error', 'First name is required');
            return false;
        }

        if (!lastName) {
            showAlert('error', 'Last name is required');
            return false;
        }
    } else if (currentStep === 3) {
        const agreeTerms = document.getElementById('agreeTerms').checked;

        if (!agreeTerms) {
            showAlert('error', 'You must agree to the Terms of Service and Privacy Policy');
            return false;
        }
    }

    return true;
}

function populateReview() {
    const reviewInfo = document.getElementById('reviewInfo');
    const formData = new FormData(document.getElementById('registerForm'));

    reviewInfo.innerHTML = `
        <h4 style="color: #667eea; margin-bottom: 1rem;">Account Information</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
            <div><strong>Username:</strong> ${formData.get('username')}</div>
            <div><strong>Email:</strong> ${formData.get('email')}</div>
        </div>
        
        <h4 style="color: #667eea; margin-bottom: 1rem;">Personal Information</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div><strong>Name:</strong> ${formData.get('firstName')} ${formData.get('lastName')}</div>
            <div><strong>Phone:</strong> ${formData.get('phone') || 'Not provided'}</div>
            <div><strong>Date of Birth:</strong> ${formData.get('dateOfBirth') || 'Not provided'}</div>
            <div><strong>Gender:</strong> ${formData.get('gender') || 'Not specified'}</div>
        </div>
        ${formData.get('address') ? `<div style="margin-top: 1rem;"><strong>Address:</strong> ${formData.get('address')}</div>` : ''}
    `;
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
        registerText.textContent = 'Creating Account...';
        registerSpinner.style.display = 'block';
        registerIcon.style.display = 'none';
    } else {
        registerBtn.disabled = false;
        registerText.textContent = 'Create Account';
        registerSpinner.style.display = 'none';
        registerIcon.style.display = 'block';
    }
}

// Form submission - FIXED VERSION
document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!validateCurrentStep()) {
        return;
    }

    setLoading(true);
    hideAlerts();

    const formData = new FormData(this);
    const registrationData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        dateOfBirth: formData.get('dateOfBirth'),
        gender: formData.get('gender'),
        address: formData.get('address')
    };

    console.log('Attempting registration...', registrationData);

    try {
        // Use absolute URL instead of relative path
        const response = await fetch(`${API_BASE_URL}/api/register/doctor`, {
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
            showAlert('success', 'Account created successfully! Redirecting to login page...');

            // Store email for login page
            localStorage.setItem('registeredEmail', registrationData.email);

            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            showAlert('error', data.error || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('error', 'Cannot connect to server. Make sure the backend is running on port 3000.');
    } finally {
        setLoading(false);
    }
});

// Test server connection on page load
window.addEventListener('load', async function () {
    try {
        const response = await fetch('http://localhost:3000');
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
    alert('Terms of Service:\n\n1. Use this service responsibly\n2. Provide accurate information\n3. Keep your account secure\n4. Respect other users\n5. Follow all applicable laws');
}

function showPrivacy() {
    alert('Privacy Policy:\n\n1. We protect your personal information\n2. Medical data is encrypted\n3. We do not sell your data\n4. You can request data deletion\n5. We comply with healthcare privacy laws');
}

// Input animations and validations
document.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('focus', function () {
        this.parentNode.style.transform = 'translateY(-2px)';
    });

    input.addEventListener('blur', function () {
        this.parentNode.style.transform = 'translateY(0)';
    });

    // Real-time validation
    input.addEventListener('input', function () {
        if (this.checkValidity()) {
            this.style.borderColor = '#27ae60';
        } else if (this.value) {
            this.style.borderColor = '#e74c3c';
        } else {
            this.style.borderColor = '#e1e5e9';
        }
    });
});