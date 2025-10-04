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
        const gender = document.getElementById('gender').value;

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

        if (!gender) {
            showAlert('error', 'Gender is required');
            return false;
        }
    } else if (currentStep === 3) {
        const specialization = document.getElementById('specialization').value.trim();
        const licenseNumber = document.getElementById('licenseNumber').value.trim();
        const qualification = document.getElementById('qualification').value.trim();
        const experience = document.getElementById('experience').value;
        const department = document.getElementById('department').value;

        if (!specialization) {
            showAlert('error', 'Specialization is required');
            return false;
        }

        if (!licenseNumber) {
            showAlert('error', 'License number is required');
            return false;
        }

        if (!qualification) {
            showAlert('error', 'Qualification is required');
            return false;
        }

        if (!experience || experience < 0) {
            showAlert('error', 'Valid experience is required');
            return false;
        }

        if (!department) {
            showAlert('error', 'Department is required');
            return false;
        }
    } else if (currentStep === 4) {
        const agreeTerms = document.getElementById('agreeTerms').checked;
        const agreeProfessional = document.getElementById('agreeProfessional').checked;
        
        if (!agreeTerms) {
            showAlert('error', 'You must agree to the Terms of Service and Privacy Policy');
            return false;
        }

        if (!agreeProfessional) {
            showAlert('error', 'You must certify that all provided information is accurate');
            return false;
        }
    }

    return true;
}

function populateReview() {
    const reviewInfo = document.getElementById('reviewInfo');
    const formData = new FormData(document.getElementById('registerForm'));
    
    // Get available days
    const availableDays = [];
    document.querySelectorAll('input[name="availableDays"]:checked').forEach(checkbox => {
        availableDays.push(checkbox.value);
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
            <div><strong>Date of Birth:</strong> ${formData.get('dateOfBirth') || 'Not provided'}</div>
            <div><strong>Gender:</strong> ${formData.get('gender')}</div>
        </div>
        
        <h4 style="color: #667eea; margin-bottom: 1rem;">Professional Information</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div><strong>Specialization:</strong> ${formData.get('specialization')}</div>
            <div><strong>License Number:</strong> ${formData.get('licenseNumber')}</div>
            <div><strong>Qualification:</strong> ${formData.get('qualification')}</div>
            <div><strong>Experience:</strong> ${formData.get('experience')} years</div>
            <div><strong>Department:</strong> ${formData.get('department')}</div>
            <div><strong>Consultation Fee:</strong> $${formData.get('consultationFee') || '0'}</div>
        </div>
        ${formData.get('biography') ? `<div style="margin-top: 1rem;"><strong>Biography:</strong> ${formData.get('biography')}</div>` : ''}
        ${availableDays.length > 0 ? `<div style="margin-top: 1rem;"><strong>Available Days:</strong> ${availableDays.join(', ')}</div>` : ''}
        ${formData.get('availableTimeSlots') ? `<div style="margin-top: 1rem;"><strong>Available Time:</strong> ${formData.get('availableTimeSlots')}</div>` : ''}
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
        registerText.textContent = 'Registering...';
        registerSpinner.style.display = 'block';
        registerIcon.style.display = 'none';
    } else {
        registerBtn.disabled = false;
        registerText.textContent = 'Register as Doctor';
        registerSpinner.style.display = 'none';
        registerIcon.style.display = 'block';
    }
}

// Form submission
document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
        return;
    }

    setLoading(true);
    hideAlerts();

    const formData = new FormData(this);
    
    // Get available days
    const availableDays = [];
    document.querySelectorAll('input[name="availableDays"]:checked').forEach(checkbox => {
        availableDays.push(checkbox.value);
    });

    const registrationData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone'),
        dateOfBirth: formData.get('dateOfBirth'),
        gender: formData.get('gender'),
        specialization: formData.get('specialization'),
        licenseNumber: formData.get('licenseNumber'),
        qualification: formData.get('qualification'),
        experience: parseInt(formData.get('experience')),
        department: formData.get('department'),
        biography: formData.get('biography'),
        consultationFee: formData.get('consultationFee') ? parseFloat(formData.get('consultationFee')) : 0,
        availableDays: availableDays,
        availableTimeSlots: formData.get('availableTimeSlots')
    };

    console.log('Attempting doctor registration...', registrationData);

    try {
        const response = await fetch('/api/register/doctor', {
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
            showAlert('success', 'Doctor account created successfully! Your account will be verified by administration.');
            
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
});

// Test server connection on page load
window.addEventListener('load', async function() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
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
    alert('Medical Professional Terms of Service:\n\n1. Provide accurate medical credentials\n2. Maintain professional standards\n3. Protect patient confidentiality\n4. Follow clinic protocols\n5. Keep credentials current\n6. Report any changes in status immediately');
}

function showPrivacy() {
    alert('Healthcare Privacy Policy:\n\n1. All medical data is protected under HIPAA\n2. Patient information is strictly confidential\n3. Data is encrypted and secured\n4. Access is logged and monitored\n5. You are responsible for maintaining confidentiality');
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