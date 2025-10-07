// State management
let currentSection = 'overview';
let currentUser = null;
let sessionId = null;
let currentAppointments = [];
let currentPatients = [];
let currentPrescriptions = [];

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelectorAll('.nav-link');
const pageTitle = document.getElementById('pageTitle');

// Section titles mapping
const sectionTitles = {
    'overview': 'Dashboard Overview',
    'appointments': 'Appointments Management',
    'patients': 'Patient Records',
    'prescriptions': 'Prescriptions Management',
    'schedule': 'My Schedule',
    'profile': 'Doctor Profile'
};

// API Base URL
const API_BASE = '/api';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Doctor Dashboard Initializing...');
    checkAuthentication();
    setupEventListeners();
    updateMobileMenuVisibility();
    window.addEventListener('resize', updateMobileMenuVisibility);
});

// Check if user is authenticated
async function checkAuthentication() {
    console.log('🔐 Checking authentication...');
    
    sessionId = localStorage.getItem('sessionId');
    const userRole = localStorage.getItem('userRole');
    
    console.log('Stored sessionId:', sessionId);
    console.log('Stored userRole:', userRole);
    
    if (!sessionId || userRole !== 'doctor') {
        console.error('❌ Authentication failed: No session or wrong role');
        redirectToLogin();
        return;
    }

    try {
        console.log('🔍 Verifying session with server...');
        
        const response = await fetch(`${API_BASE}/doctor/profile`, {
            headers: {
                'Session-Id': sessionId
            }
        });

        console.log('Profile API response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.error('❌ Session invalid (401)');
            } else if (response.status === 403) {
                console.error('❌ Access denied (403)');
            } else {
                console.error('❌ API error:', response.status);
            }
            throw new Error('Not authenticated');
        }

        const data = await response.json();
        console.log('✅ Authentication successful, user data:', data);
        
        currentUser = data;
        updateUserInfo(data);
        initializeDashboard();
        loadDashboardData();
        
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        
        // Clear invalid session data
        localStorage.removeItem('sessionId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userData');
        
        redirectToLogin();
    }
}

function redirectToLogin() {
    console.log('🔄 Redirecting to login page...');
    window.location.href = '/login';
}

// Update user information in the UI
function updateUserInfo(user) {
    const userNameElement = document.querySelector('.user-name');
    const userRoleElement = document.querySelector('.user-role');
    const profileName = document.getElementById('doctorName');
    const profileSpecialization = document.getElementById('specialization');
    const profilePhone = document.getElementById('phone');
    const profileLicense = document.getElementById('licenseNumber');
    const profileExperience = document.getElementById('experience');
    const profileBio = document.getElementById('biography');
    const profileFee = document.getElementById('consultationFee');
    
    if (userNameElement) userNameElement.textContent = `${user.firstName} ${user.lastName}`;
    if (userRoleElement) userRoleElement.textContent = user.specialization || 'Doctor';
    if (profileName) profileName.value = `${user.firstName} ${user.lastName}`;
    if (profileSpecialization) profileSpecialization.value = user.specialization || '';
    if (profilePhone) profilePhone.value = user.phone || '';
    if (profileLicense) profileLicense.value = user.licenseNumber || '';
    if (profileExperience) profileExperience.value = user.experience || '';
    if (profileBio) profileBio.value = user.biography || '';
    if (profileFee) profileFee.value = user.consultationFee || '';
}

// Initialize dashboard
function initializeDashboard() {
    // Set minimum date for schedule
    const scheduleDate = document.getElementById('scheduleDate');
    if (scheduleDate) {
        const today = new Date().toISOString().split('T')[0];
        scheduleDate.value = today;
        scheduleDate.min = today;
    }
    
    console.log('✅ Doctor Dashboard Initialized');
}

// Setup all event listeners
function setupEventListeners() {
    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // Navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Forms
    const prescriptionForm = document.getElementById('prescriptionForm');
    if (prescriptionForm) {
        prescriptionForm.addEventListener('submit', handlePrescriptionSubmit);
    }

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }

    // Search functionality
    const appointmentSearch = document.getElementById('appointmentSearch');
    if (appointmentSearch) {
        appointmentSearch.addEventListener('input', filterAppointments);
    }

    const patientSearch = document.getElementById('patientSearch');
    if (patientSearch) {
        patientSearch.addEventListener('input', filterPatients);
    }

    // Schedule date change
    const scheduleDate = document.getElementById('scheduleDate');
    if (scheduleDate) {
        scheduleDate.addEventListener('change', loadSchedule);
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Modal click outside to close
    window.addEventListener('click', handleModalOutsideClick);
}

// Load dashboard data
async function loadDashboardData() {
    try {
        console.log('📊 Loading dashboard data...');
        await Promise.all([
            loadDashboardStats(),
            loadAppointments(),
            loadPatients(),
            loadPrescriptions(),
            loadSchedule()
        ]);
        console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showAlert('globalAlert', 'Failed to load dashboard data. Please refresh the page.', 'error');
    }
}

// Refresh all data
async function refreshData() {
    showAlert('globalAlert', 'Refreshing data...', 'info');
    await loadDashboardData();
    showAlert('globalAlert', 'Data refreshed successfully!', 'success');
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/doctor/dashboard/stats`, {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error('Failed to load stats');

        const stats = await response.json();
        updateStatsDisplay(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
        // Set fallback data
        updateStatsDisplay({
            todayAppointments: 0,
            totalPatients: 0,
            todayPrescriptions: 0,
            pendingAppointments: 0
        });
    }
}

// Update stats display
function updateStatsDisplay(stats) {
    const elements = {
        'stat-appointments': stats.todayAppointments || 0,
        'stat-patients': stats.totalPatients || 0,
        'stat-prescriptions': stats.todayPrescriptions || 0,
        'stat-pending': stats.pendingAppointments || 0
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Load appointments
async function loadAppointments(status = '') {
    try {
        const url = status ? 
            `${API_BASE}/doctor/appointments?status=${status}` : 
            `${API_BASE}/doctor/appointments`;

        const response = await fetch(url, {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error('Failed to load appointments');

        const data = await response.json();
        currentAppointments = data.appointments || [];
        displayAppointments(currentAppointments);
        
        // Also update today's schedule
        updateTodaySchedule(currentAppointments);
        
    } catch (error) {
        console.error('Error loading appointments:', error);
        showAlert('appointmentAlert', 'Failed to load appointments', 'error');
        currentAppointments = [];
        displayAppointments([]);
    }
}

// Update today's schedule
function updateTodaySchedule(appointments) {
    const container = document.getElementById('todaySchedule');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(apt => 
        new Date(apt.appointmentDate).toISOString().split('T')[0] === today
    );

    if (todayAppointments.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="text-center">No appointments scheduled for today</td></tr>';
        return;
    }

    container.innerHTML = todayAppointments.map(appointment => `
        <tr>
            <td>${appointment.timeSlot ? appointment.timeSlot.startTime : 'N/A'}</td>
            <td>${appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'N/A'}</td>
            <td>${appointment.appointmentType || 'Consultation'}</td>
            <td>
                <span class="status-badge status-${appointment.status}">
                    ${appointment.status || 'scheduled'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-sm" onclick="viewAppointmentDetails('${appointment._id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${appointment.status === 'scheduled' ? `
                        <button class="btn btn-success btn-sm" onclick="updateAppointmentStatus('${appointment._id}', 'completed')">
                            <i class="fas fa-check"></i> Complete
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Display appointments in table
function displayAppointments(appointments) {
    const container = document.getElementById('appointmentsList');
    if (!container) return;

    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="text-center">No appointments found</td></tr>';
        return;
    }

    container.innerHTML = appointments.map(appointment => `
        <tr>
            <td>${appointment.appointmentId || 'N/A'}</td>
            <td>${appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'N/A'}</td>
            <td>${new Date(appointment.appointmentDate).toLocaleDateString()}</td>
            <td>${appointment.timeSlot ? appointment.timeSlot.startTime : 'N/A'}</td>
            <td>${appointment.appointmentType || 'Consultation'}</td>
            <td>
                <span class="status-badge status-${appointment.status}">
                    ${appointment.status || 'scheduled'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-sm" onclick="viewAppointmentDetails('${appointment._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${appointment.status === 'scheduled' || appointment.status === 'pending' ? `
                        <button class="btn btn-success btn-sm" onclick="updateAppointmentStatus('${appointment._id}', 'completed')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="updateAppointmentStatus('${appointment._id}', 'cancelled')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-warning btn-sm" onclick="createPrescriptionForAppointment('${appointment._id}')">
                        <i class="fas fa-prescription"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load patients
async function loadPatients() {
    try {
        const response = await fetch(`${API_BASE}/doctor/patients`, {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error('Failed to load patients');

        const data = await response.json();
        currentPatients = data.patients || [];
        displayPatients(currentPatients);
    } catch (error) {
        console.error('Error loading patients:', error);
        showAlert('patientAlert', 'Failed to load patients', 'error');
        currentPatients = [];
        displayPatients([]);
    }
}

// Display patients
function displayPatients(patients) {
    const container = document.getElementById('patientsList');
    if (!container) return;

    if (!patients || patients.length === 0) {
        container.innerHTML = '<div class="col-12 text-center">No patients found</div>';
        return;
    }

    container.innerHTML = patients.map(patient => `
        <div class="col-md-6 col-lg-4">
            <div class="patient-card">
                <div class="patient-header">
                    <h5>${patient.firstName} ${patient.lastName}</h5>
                    <span class="patient-id">${patient.patientId}</span>
                </div>
                <div class="patient-info">
                    <p><i class="fas fa-envelope"></i> ${patient.email}</p>
                    <p><i class="fas fa-phone"></i> ${patient.phone}</p>
                    <p><i class="fas fa-birthday-cake"></i> ${patient.age || 'N/A'} years</p>
                    ${patient.bloodGroup ? `<p><i class="fas fa-tint"></i> ${patient.bloodGroup}</p>` : ''}
                </div>
                <div class="patient-actions">
                    <button class="btn btn-primary btn-sm" onclick="viewPatientDetails('${patient._id}')">
                        <i class="fas fa-eye"></i> Details
                    </button>
                    <button class="btn btn-success btn-sm" onclick="createPrescriptionForPatient('${patient._id}')">
                        <i class="fas fa-prescription"></i> Prescribe
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Load prescriptions
async function loadPrescriptions() {
    try {
        const response = await fetch(`${API_BASE}/doctor/prescriptions`, {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error('Failed to load prescriptions');

        const data = await response.json();
        currentPrescriptions = data.prescriptions || [];
        displayPrescriptions(currentPrescriptions);
    } catch (error) {
        console.error('Error loading prescriptions:', error);
        showAlert('prescriptionAlert', 'Failed to load prescriptions', 'error');
        currentPrescriptions = [];
        displayPrescriptions([]);
    }
}

// Display prescriptions
function displayPrescriptions(prescriptions) {
    const container = document.getElementById('prescriptionsList');
    if (!container) return;

    if (!prescriptions || prescriptions.length === 0) {
        container.innerHTML = '<div class="text-center">No prescriptions found</div>';
        return;
    }

    container.innerHTML = prescriptions.map(prescription => `
        <div class="prescription-item">
            <div class="prescription-info">
                <h5>${prescription.patient ? `${prescription.patient.firstName} ${prescription.patient.lastName}` : 'Unknown Patient'}</h5>
                <p><i class="fas fa-pills"></i> ${prescription.medications.map(med => `${med.name} ${med.dosage}`).join(', ')}</p>
                <p><i class="fas fa-calendar"></i> Issued: ${new Date(prescription.issuedDate).toLocaleDateString()}</p>
                <p><i class="fas fa-clock"></i> Valid until: ${new Date(prescription.validUntil).toLocaleDateString()}</p>
                <p><strong>Diagnosis:</strong> ${prescription.diagnosis}</p>
            </div>
            <div>
                <button class="btn btn-info btn-sm" onclick="printPrescription('${prescription._id}')">
                    <i class="fas fa-print"></i> Print
                </button>
                <button class="btn btn-warning btn-sm" onclick="viewPrescription('${prescription._id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

// Load schedule
async function loadSchedule() {
    const scheduleDate = document.getElementById('scheduleDate');
    const date = scheduleDate ? scheduleDate.value : new Date().toISOString().split('T')[0];
    
    try {
        const response = await fetch(`${API_BASE}/doctor/appointments?date=${date}`, {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error('Failed to load schedule');

        const data = await response.json();
        displaySchedule(data.appointments || []);
    } catch (error) {
        console.error('Error loading schedule:', error);
        showAlert('scheduleAlert', 'Failed to load schedule', 'error');
        displaySchedule([]);
    }
}

// Display schedule
function displaySchedule(appointments) {
    const container = document.getElementById('scheduleList');
    if (!container) return;

    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<div class="text-center">No appointments scheduled for this date</div>';
        return;
    }

    container.innerHTML = appointments.map(appointment => `
        <div class="schedule-item">
            <div class="schedule-time">
                <strong>${appointment.timeSlot ? appointment.timeSlot.startTime : 'N/A'}</strong>
            </div>
            <div class="schedule-details">
                <h6>${appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Unknown Patient'}</h6>
                <p>${appointment.appointmentType || 'Consultation'} - ${appointment.symptoms || 'No symptoms provided'}</p>
                <span class="status-badge status-${appointment.status}">
                    ${appointment.status}
                </span>
            </div>
            <div class="schedule-actions">
                <button class="btn btn-primary btn-sm" onclick="viewAppointmentDetails('${appointment._id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Update mobile menu visibility based on screen size
function updateMobileMenuVisibility() {
    if (window.innerWidth <= 768) {
        if (mobileMenuBtn) mobileMenuBtn.style.display = 'flex';
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    } else {
        if (mobileMenuBtn) mobileMenuBtn.style.display = 'none';
        if (sidebar) sidebar.classList.add('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }
}

// Toggle sidebar for mobile
function toggleSidebar() {
    if (sidebar) sidebar.classList.toggle('active');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    
    // Prevent body scrolling when sidebar is open
    if (sidebar && sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

// Handle navigation link clicks
function handleNavigation(e) {
    e.preventDefault();
    const section = this.getAttribute('data-section');
    if (section) {
        showSection(section);
    }
}

// Show specific section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav links
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionName + '-section');
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
    
    // Add active class to corresponding nav link
    const activeLink = document.querySelector(`.nav-link[data-section="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Update page title
    if (pageTitle) {
        pageTitle.textContent = sectionTitles[sectionName] || 'Dashboard';
    }
    
    currentSection = sectionName;
    
    // Load section-specific data
    switch(sectionName) {
        case 'appointments':
            loadAppointments();
            break;
        case 'patients':
            loadPatients();
            break;
        case 'prescriptions':
            loadPrescriptions();
            break;
        case 'schedule':
            loadSchedule();
            break;
    }
    
    // Close mobile sidebar if open
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Load data for specific modals
        if (modalId === 'addPrescriptionModal') {
            loadPatientsForPrescription();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Load patients for prescription form
async function loadPatientsForPrescription() {
    try {
        const response = await fetch(`${API_BASE}/doctor/patients`, {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error('Failed to load patients');

        const data = await response.json();
        const select = document.getElementById('prescPatient');
        
        if (select && data.patients) {
            select.innerHTML = '<option value="">Select Patient</option>' +
                data.patients.map(patient => 
                    `<option value="${patient._id}">${patient.firstName} ${patient.lastName} (${patient.patientId})</option>`
                ).join('');
        }
    } catch (error) {
        console.error('Error loading patients for prescription:', error);
        showAlert('prescriptionAlert', 'Failed to load patients list', 'error');
    }
}

// Show alert message
function showAlert(elementId, message, type = 'info', duration = 5000) {
    const alertElement = document.getElementById(elementId);
    if (alertElement) {
        alertElement.textContent = message;
        alertElement.className = `alert alert-${type === 'error' ? 'danger' : type}`;
        alertElement.style.display = 'block';
        
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, duration);
    }
}

// Handle prescription form submission
async function handlePrescriptionSubmit(e) {
    e.preventDefault();
    
    const patientId = document.getElementById('prescPatient').value;
    const medication = document.getElementById('medication').value;
    const dosage = document.getElementById('dosage').value;
    const frequency = document.getElementById('frequency').value;
    const duration = document.getElementById('duration').value;
    const instructions = document.getElementById('instructions').value;
    const diagnosis = document.getElementById('diagnosis').value;
    const additionalNotes = document.getElementById('additionalNotes').value;
    
    // Validation
    if (!patientId || !medication || !dosage || !frequency || !duration || !diagnosis) {
        showAlert('prescriptionAlert', 'Please fill in all required fields.', 'error');
        return;
    }
    
    if (parseInt(duration) <= 0) {
        showAlert('prescriptionAlert', 'Duration must be a positive number.', 'error');
        return;
    }
    
    try {
        const prescriptionData = {
            patientId,
            medications: [{
                name: medication,
                dosage: dosage,
                frequency: frequency,
                duration: parseInt(duration),
                quantity: parseInt(document.getElementById('quantity').value) || 1,
                instructions: instructions
            }],
            diagnosis,
            additionalNotes,
            validDays: parseInt(duration)
        };
        
        const response = await fetch(`${API_BASE}/doctor/prescriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Session-Id': sessionId
            },
            body: JSON.stringify(prescriptionData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create prescription');
        }
        
        const result = await response.json();
        showAlert('prescriptionAlert', 'Prescription created successfully!', 'success');
        
        // Close modal and reset form
        closeModal('addPrescriptionModal');
        e.target.reset();
        
        // Reload prescriptions list and stats
        loadPrescriptions();
        loadDashboardStats();
        
    } catch (error) {
        console.error('Error creating prescription:', error);
        showAlert('prescriptionAlert', error.message, 'error');
    }
}

// Handle profile form submission
async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('doctorName').value;
    const specialization = document.getElementById('specialization').value;
    const phone = document.getElementById('phone').value;
    const biography = document.getElementById('biography').value;
    const consultationFee = document.getElementById('consultationFee').value;
    const licenseNumber = document.getElementById('licenseNumber').value;
    const experience = document.getElementById('experience').value;
    
    // Validation
    if (!fullName || !specialization) {
        showAlert('profileAlert', 'Name and specialization are required.', 'error');
        return;
    }
    
    const nameParts = fullName.split(' ');
    if (nameParts.length < 2) {
        showAlert('profileAlert', 'Please enter both first and last name.', 'error');
        return;
    }
    
    try {
        const profileData = {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(' '),
            specialization,
            phone: phone || undefined,
            biography: biography || undefined,
            consultationFee: consultationFee ? parseFloat(consultationFee) : undefined,
            licenseNumber: licenseNumber || undefined,
            experience: experience ? parseInt(experience) : undefined
        };
        
        const response = await fetch(`${API_BASE}/doctor/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Session-Id': sessionId
            },
            body: JSON.stringify(profileData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update profile');
        }
        
        const result = await response.json();
        showAlert('profileAlert', 'Profile updated successfully!', 'success');
        
        // Update user info
        currentUser = { ...currentUser, ...result.doctor };
        updateUserInfo(currentUser);
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('profileAlert', error.message, 'error');
    }
}

// Update appointment status
async function updateAppointmentStatus(appointmentId, status) {
    if (!confirm(`Are you sure you want to mark this appointment as ${status}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/doctor/appointments/${appointmentId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Session-Id': sessionId
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update appointment');
        }
        
        showAlert('appointmentAlert', `Appointment ${status} successfully!`, 'success');
        
        // Reload appointments and stats
        loadAppointments();
        loadSchedule();
        loadDashboardStats();
        
    } catch (error) {
        console.error('Error updating appointment:', error);
        showAlert('appointmentAlert', error.message, 'error');
    }
}

// View patient details
async function viewPatientDetails(patientId) {
    try {
        const response = await fetch(`${API_BASE}/doctor/patients/${patientId}`, {
            headers: {
                'Session-Id': sessionId
            }
        });
        
        if (!response.ok) throw new Error('Failed to load patient details');
        
        const data = await response.json();
        displayPatientDetails(data);
        openModal('patientDetailsModal');
        
    } catch (error) {
        console.error('Error loading patient details:', error);
        showAlert('globalAlert', 'Failed to load patient details', 'error');
    }
}

// Display patient details in modal
function displayPatientDetails(data) {
    const container = document.getElementById('patientDetailsContent');
    if (!container) return;
    
    const { patient, recentAppointments = [], recentPrescriptions = [] } = data;
    
    container.innerHTML = `
        <div class="patient-detail-section">
            <h4>Personal Information</h4>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Name:</strong> ${patient.firstName} ${patient.lastName}</p>
                    <p><strong>Patient ID:</strong> ${patient.patientId}</p>
                    <p><strong>Email:</strong> ${patient.email}</p>
                    <p><strong>Phone:</strong> ${patient.phone}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Date of Birth:</strong> ${new Date(patient.dateOfBirth).toLocaleDateString()}</p>
                    <p><strong>Age:</strong> ${patient.age || 'N/A'} years</p>
                    <p><strong>Gender:</strong> ${patient.gender}</p>
                    ${patient.bloodGroup ? `<p><strong>Blood Group:</strong> ${patient.bloodGroup}</p>` : ''}
                </div>
            </div>
        </div>
        
        ${patient.address ? `
            <div class="patient-detail-section">
                <h4>Address</h4>
                <p>${patient.address.street || ''}, ${patient.address.city || ''}, ${patient.address.state || ''} ${patient.address.zipCode || ''}</p>
            </div>
        ` : ''}
        
        ${patient.medicalHistory ? `
            <div class="patient-detail-section">
                <h4>Medical History</h4>
                ${patient.medicalHistory.allergies && patient.medicalHistory.allergies.length > 0 ? `
                    <p><strong>Allergies:</strong> ${patient.medicalHistory.allergies.join(', ')}</p>
                ` : ''}
                ${patient.medicalHistory.chronicConditions && patient.medicalHistory.chronicConditions.length > 0 ? `
                    <p><strong>Chronic Conditions:</strong> ${patient.medicalHistory.chronicConditions.join(', ')}</p>
                ` : ''}
            </div>
        ` : ''}
        
        ${recentAppointments.length > 0 ? `
            <div class="patient-detail-section">
                <h4>Recent Appointments</h4>
                ${recentAppointments.map(apt => `
                    <div class="appointment-mini">
                        <strong>${new Date(apt.appointmentDate).toLocaleDateString()}</strong> - 
                        ${apt.timeSlot ? apt.timeSlot.startTime : 'N/A'} - 
                        <span class="status-badge status-${apt.status}">${apt.status}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        ${recentPrescriptions.length > 0 ? `
            <div class="patient-detail-section">
                <h4>Recent Prescriptions</h4>
                ${recentPrescriptions.map(presc => `
                    <div class="prescription-mini">
                        <strong>${new Date(presc.issuedDate).toLocaleDateString()}</strong> - 
                        ${presc.medications.map(med => med.name).join(', ')}
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <div class="patient-detail-section">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <button class="btn btn-success" onclick="createPrescriptionForPatient('${patient._id}'); closeModal('patientDetailsModal')">
                    <i class="fas fa-prescription"></i> New Prescription
                </button>
                <button class="btn btn-info" onclick="closeModal('patientDetailsModal')">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
}

// Create prescription for specific patient
function createPrescriptionForPatient(patientId) {
    openModal('addPrescriptionModal');
    // Set the patient in the form
    setTimeout(() => {
        const patientSelect = document.getElementById('prescPatient');
        if (patientSelect) {
            patientSelect.value = patientId;
        }
    }, 100);
}

// Create prescription for specific appointment
function createPrescriptionForAppointment(appointmentId) {
    const appointment = currentAppointments.find(apt => apt._id === appointmentId);
    if (appointment && appointment.patient) {
        openModal('addPrescriptionModal');
        setTimeout(() => {
            const patientSelect = document.getElementById('prescPatient');
            if (patientSelect) {
                patientSelect.value = appointment.patient._id;
            }
            const diagnosisInput = document.getElementById('diagnosis');
            if (diagnosisInput && appointment.symptoms) {
                diagnosisInput.value = `Follow-up: ${appointment.symptoms}`;
            }
        }, 100);
    }
}

// View appointment details
async function viewAppointmentDetails(appointmentId) {
    try {
        const appointment = currentAppointments.find(apt => apt._id === appointmentId);
        if (appointment) {
            displayAppointmentDetails(appointment);
            openModal('appointmentDetailsModal');
        } else {
            showAlert('globalAlert', 'Appointment details not available', 'error');
        }
    } catch (error) {
        console.error('Error loading appointment details:', error);
        showAlert('globalAlert', 'Failed to load appointment details', 'error');
    }
}

// Display appointment details
function displayAppointmentDetails(appointment) {
    const container = document.getElementById('appointmentDetailsContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="appointment-detail-section">
            <h4>Appointment Information</h4>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Appointment ID:</strong> ${appointment.appointmentId || 'N/A'}</p>
                    <p><strong>Patient:</strong> ${appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'N/A'}</p>
                    <p><strong>Date:</strong> ${new Date(appointment.appointmentDate).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${appointment.timeSlot ? appointment.timeSlot.startTime : 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Type:</strong> ${appointment.appointmentType || 'Consultation'}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${appointment.status}">${appointment.status}</span></p>
                    <p><strong>Payment Status:</strong> ${appointment.paymentStatus || 'N/A'}</p>
                    <p><strong>Amount:</strong> $${appointment.amount || '0'}</p>
                </div>
            </div>
        </div>
        
        ${appointment.symptoms ? `
            <div class="appointment-detail-section">
                <h4>Symptoms</h4>
                <p>${appointment.symptoms}</p>
            </div>
        ` : ''}
        
        ${appointment.diagnosis ? `
            <div class="appointment-detail-section">
                <h4>Diagnosis</h4>
                <p>${appointment.diagnosis}</p>
            </div>
        ` : ''}
        
        ${appointment.notes ? `
            <div class="appointment-detail-section">
                <h4>Notes</h4>
                <p>${appointment.notes}</p>
            </div>
        ` : ''}
        
        <div class="appointment-detail-section">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                ${appointment.status === 'scheduled' || appointment.status === 'pending' ? `
                    <button class="btn btn-success" onclick="updateAppointmentStatus('${appointment._id}', 'completed'); closeModal('appointmentDetailsModal')">
                        <i class="fas fa-check"></i> Mark Complete
                    </button>
                    <button class="btn btn-danger" onclick="updateAppointmentStatus('${appointment._id}', 'cancelled'); closeModal('appointmentDetailsModal')">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                ` : ''}
                <button class="btn btn-warning" onclick="createPrescriptionForAppointment('${appointment._id}'); closeModal('appointmentDetailsModal')">
                    <i class="fas fa-prescription"></i> Create Prescription
                </button>
                <button class="btn btn-info" onclick="closeModal('appointmentDetailsModal')">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
}

// Print prescription
async function printPrescription(prescriptionId) {
    try {
        const response = await fetch(`${API_BASE}/doctor/prescriptions/${prescriptionId}`, {
            headers: {
                'Session-Id': sessionId
            }
        });
        
        if (!response.ok) throw new Error('Failed to load prescription details');
        
        const prescription = await response.json();
        displayPrintPrescription(prescription);
        openModal('printPrescriptionModal');
        
    } catch (error) {
        console.error('Error loading prescription for printing:', error);
        showAlert('globalAlert', 'Failed to load prescription for printing', 'error');
    }
}

// Display prescription for printing
function displayPrintPrescription(prescription) {
    const container = document.getElementById('printPrescriptionContent');
    if (!container) return;
    
    const printDate = new Date().toLocaleDateString();
    
    container.innerHTML = `
        <div class="print-prescription" style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #000;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #667eea; margin: 0;">MedCare Clinic</h2>
                <p style="margin: 5px 0;">123 Healthcare Street, Medical City, MC 12345</p>
                <p style="margin: 5px 0;">Phone: (555) 123-4567 | Email: info@medcare.com</p>
            </div>
            
            <hr style="border: 1px solid #000; margin: 20px 0;">
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0 0 10px 0;">PRESCRIPTION</h3>
                    <p><strong>Prescription ID:</strong> ${prescription.prescriptionId}</p>
                    <p><strong>Date Issued:</strong> ${new Date(prescription.issuedDate).toLocaleDateString()}</p>
                    <p><strong>Valid Until:</strong> ${new Date(prescription.validUntil).toLocaleDateString()}</p>
                </div>
                <div style="text-align: right;">
                    <p><strong>Doctor:</strong> Dr. ${currentUser.firstName} ${currentUser.lastName}</p>
                    <p><strong>Specialization:</strong> ${currentUser.specialization}</p>
                    <p><strong>License:</strong> ${currentUser.licenseNumber || 'N/A'}</p>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0;">Patient Information</h4>
                <p><strong>Name:</strong> ${prescription.patient ? `${prescription.patient.firstName} ${prescription.patient.lastName}` : 'Unknown'}</p>
                <p><strong>Patient ID:</strong> ${prescription.patient ? prescription.patient.patientId : 'N/A'}</p>
                <p><strong>Age:</strong> ${prescription.patient ? prescription.patient.age || 'N/A' : 'N/A'}</p>
                <p><strong>Gender:</strong> ${prescription.patient ? prescription.patient.gender : 'N/A'}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0;">Diagnosis</h4>
                <p>${prescription.diagnosis}</p>
                ${prescription.additionalNotes ? `
                    <p><strong>Notes:</strong> ${prescription.additionalNotes}</p>
                ` : ''}
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0;">Medications</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Medication</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Dosage</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Frequency</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Duration</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Instructions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${prescription.medications.map(med => `
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px;">${med.name}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${med.dosage}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${med.frequency}</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${med.duration} days</td>
                                <td style="border: 1px solid #ddd; padding: 8px;">${med.instructions || 'Take as directed'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 30px; border-top: 2px solid #000; padding-top: 20px;">
                <div style="display: flex; justify-content: space-between;">
                    <div>
                        <p><strong>Doctor's Signature:</strong></p>
                        <p style="margin-top: 50px;">_________________________</p>
                        <p>Dr. ${currentUser.firstName} ${currentUser.lastName}</p>
                        <p>${currentUser.specialization}</p>
                        <p>License: ${currentUser.licenseNumber || 'N/A'}</p>
                    </div>
                    <div style="text-align: right;">
                        <p><strong>Date:</strong> ${printDate}</p>
                        <p><strong>Stamp:</strong></p>
                        <div style="border: 2px solid #000; width: 100px; height: 100px; margin-left: auto;"></div>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
                <p>This is a computer-generated prescription. No physical signature is required.</p>
                <p>For any queries, please contact MedCare Clinic at (555) 123-4567</p>
            </div>
        </div>
    `;
}

// View prescription details
async function viewPrescription(prescriptionId) {
    try {
        const response = await fetch(`${API_BASE}/doctor/prescriptions/${prescriptionId}`, {
            headers: {
                'Session-Id': sessionId
            }
        });
        
        if (!response.ok) throw new Error('Failed to load prescription details');
        
        const prescription = await response.json();
        displayPrescriptionDetails(prescription);
        openModal('prescriptionDetailsModal');
        
    } catch (error) {
        console.error('Error loading prescription details:', error);
        showAlert('globalAlert', 'Failed to load prescription details', 'error');
    }
}

// Display prescription details
function displayPrescriptionDetails(prescription) {
    const container = document.getElementById('prescriptionDetailsContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="prescription-detail-section">
            <h4>Prescription Details</h4>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Prescription ID:</strong> ${prescription.prescriptionId}</p>
                    <p><strong>Patient:</strong> ${prescription.patient ? `${prescription.patient.firstName} ${prescription.patient.lastName}` : 'Unknown'}</p>
                    <p><strong>Issued Date:</strong> ${new Date(prescription.issuedDate).toLocaleDateString()}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Valid Until:</strong> ${new Date(prescription.validUntil).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${prescription.status}">${prescription.status}</span></p>
                    ${prescription.appointment ? `<p><strong>Appointment:</strong> ${prescription.appointment.appointmentId}</p>` : ''}
                </div>
            </div>
        </div>
        
        <div class="prescription-detail-section">
            <h4>Diagnosis</h4>
            <p>${prescription.diagnosis}</p>
            ${prescription.additionalNotes ? `
                <p><strong>Additional Notes:</strong> ${prescription.additionalNotes}</p>
            ` : ''}
        </div>
        
        <div class="prescription-detail-section">
            <h4>Medications</h4>
            ${prescription.medications.map(med => `
                <div class="medication-item" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <h5 style="margin: 0 0 10px 0; color: #667eea;">${med.name} ${med.dosage}</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Frequency:</strong> ${med.frequency}</p>
                            <p><strong>Duration:</strong> ${med.duration} days</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Quantity:</strong> ${med.quantity}</p>
                            ${med.instructions ? `<p><strong>Instructions:</strong> ${med.instructions}</p>` : ''}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="prescription-detail-section">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <button class="btn btn-info" onclick="printPrescription('${prescription._id}'); closeModal('prescriptionDetailsModal')">
                    <i class="fas fa-print"></i> Print
                </button>
                <button class="btn btn-secondary" onclick="closeModal('prescriptionDetailsModal')">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
}

// Filter appointments by search term
function filterAppointments(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#appointmentsList tr');
    
    rows.forEach(row => {
        const patientName = row.cells[1] ? row.cells[1].textContent.toLowerCase() : '';
        if (patientName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Filter patients by search term
function filterPatients(e) {
    const searchTerm = e.target.value.toLowerCase();
    const patients = document.querySelectorAll('.patient-card');
    
    patients.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Handle logout
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }
    
    try {
        if (sessionId) {
            await fetch(`${API_BASE}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Session-Id': sessionId
                },
                body: JSON.stringify({ sessionId })
            });
        }
    } catch (error) {
        console.error('Error during logout:', error);
    } finally {
        // Clear local storage and redirect
        localStorage.removeItem('sessionId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userData');
        window.location.href = '/login';
    }
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // ESC key to close modals and sidebar
    if (e.key === 'Escape') {
        // Close all open modals
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = 'auto';
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    }
    
    // Ctrl/Cmd + Number keys for quick navigation
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const sections = ['overview', 'appointments', 'patients', 'prescriptions', 'schedule', 'profile'];
        const sectionIndex = parseInt(e.key) - 1;
        if (sections[sectionIndex]) {
            showSection(sections[sectionIndex]);
        }
    }
    
    // Ctrl/Cmd + R to refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshData();
    }
}

// Handle modal outside click to close
function handleModalOutsideClick(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Export functions for inline HTML use
window.openModal = openModal;
window.closeModal = closeModal;
window.showAlert = showAlert;
window.updateAppointmentStatus = updateAppointmentStatus;
window.viewPatientDetails = viewPatientDetails;
window.viewAppointmentDetails = viewAppointmentDetails;
window.printPrescription = printPrescription;
window.viewPrescription = viewPrescription;
window.createPrescriptionForPatient = createPrescriptionForPatient;
window.createPrescriptionForAppointment = createPrescriptionForAppointment;
window.handleLogout = handleLogout;
window.refreshData = refreshData;

// Filter appointments by status
window.filterAppointmentsByStatus = function(status) {
    loadAppointments(status);
};

// Debug function
window.debugDashboard = function() {
    console.log('=== DASHBOARD DEBUG INFO ===');
    console.log('Current User:', currentUser);
    console.log('Session ID:', sessionId);
    console.log('Appointments:', currentAppointments.length);
    console.log('Patients:', currentPatients.length);
    console.log('Prescriptions:', currentPrescriptions.length);
    console.log('Current Section:', currentSection);
    console.log('==========================');
};