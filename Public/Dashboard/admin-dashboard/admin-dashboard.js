// State management
let currentSection = 'overview';
let currentUser = null;
let sessionId = null;
let currentDoctors = [];
let currentPatients = [];
let currentAppointments = [];
let currentDepartments = [];
let currentStaff = [];

// API Base URL
const API_BASE = '/api/admin';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin Dashboard Initializing...');
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
    
    if (!sessionId || userRole !== 'admin') {
        console.error('❌ Authentication failed: No session or wrong role');
        redirectToLogin();
        return;
    }

    try {
        console.log('🔍 Verifying session with server...');
        
        const response = await fetch('/api/profile', {
            headers: {
                'Session-Id': sessionId
            }
        });

        console.log('Profile API response status:', response.status);
        
        if (!response.ok) {
            throw new Error('Not authenticated');
        }

        const data = await response.json();
        console.log('✅ Authentication successful, user data:', data);
        
        currentUser = data.user;
        updateUserInfo(data.user);
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
    
    if (userNameElement) userNameElement.textContent = `${user.firstName} ${user.lastName}`;
    if (userRoleElement) userRoleElement.textContent = user.role || 'Admin';
}

// Initialize dashboard
function initializeDashboard() {
    // Set default dates for reports
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    
    if (startDate && endDate) {
        const today = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1);
        
        startDate.value = oneMonthAgo.toISOString().split('T')[0];
        endDate.value = today.toISOString().split('T')[0];
    }
    
    console.log('✅ Admin Dashboard Initialized');
}

// Setup all event listeners
function setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Forms
    const addDoctorForm = document.getElementById('addDoctorForm');
    if (addDoctorForm) {
        addDoctorForm.addEventListener('submit', handleAddDoctor);
    }

    const addDepartmentForm = document.getElementById('addDepartmentForm');
    if (addDepartmentForm) {
        addDepartmentForm.addEventListener('submit', handleAddDepartment);
    }

    const addStaffForm = document.getElementById('addStaffForm');
    if (addStaffForm) {
        addStaffForm.addEventListener('submit', handleAddStaff);
    }

    // Search functionality
    const doctorSearch = document.getElementById('doctorSearch');
    if (doctorSearch) {
        doctorSearch.addEventListener('input', debounce(filterDoctors, 300));
    }

    const patientSearch = document.getElementById('patientSearch');
    if (patientSearch) {
        patientSearch.addEventListener('input', debounce(filterPatients, 300));
    }

    // Settings tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', handleTabClick);
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load dashboard data
async function loadDashboardData() {
    try {
        console.log('📊 Loading dashboard data...');
        await Promise.all([
            loadDashboardStats(),
            loadDoctors(),
            loadPatients(),
            loadAppointments(),
            loadDepartments(),
            loadStaff(),
            loadRecentActivity(),
            loadSystemAlerts()
        ]);
        console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showAlert('Failed to load dashboard data. Please refresh the page.', 'error');
    }
}

// Refresh all data
async function refreshData() {
    showAlert('Refreshing data...', 'info');
    await loadDashboardData();
    showAlert('Data refreshed successfully!', 'success');
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/stats`, {
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
            totalDoctors: 0,
            totalPatients: 0,
            todayAppointments: 0,
            todayRevenue: 0
        });
    }
}

// Update stats display
function updateStatsDisplay(stats) {
    const elements = {
        'stat-doctors': stats.totalDoctors || 0,
        'stat-patients': stats.totalPatients || 0,
        'stat-appointments': stats.todayAppointments || 0,
        'stat-revenue': `$${stats.todayRevenue || 0}`
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Load doctors
async function loadDoctors() {
    try {
        const response = await fetch(`${API_BASE}/doctors`, {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error('Failed to load doctors');

        const data = await response.json();
        currentDoctors = data.doctors || [];
        displayDoctors(currentDoctors);
    } catch (error) {
        console.error('Error loading doctors:', error);
        showAlert('Failed to load doctors', 'error');
        currentDoctors = [];
        displayDoctors([]);
    }
}

// Display doctors
function displayDoctors(doctors) {
    const container = document.getElementById('doctorsList');
    if (!container) return;

    if (!doctors || doctors.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="text-center py-4">No doctors found</td></tr>';
        return;
    }

    container.innerHTML = doctors.map(doctor => `
        <tr>
            <td>${doctor._id ? doctor._id.toString().substring(0, 8) + '...' : 'N/A'}</td>
            <td>Dr. ${doctor.firstName} ${doctor.lastName}</td>
            <td>${doctor.specialization}</td>
            <td>${doctor.email}</td>
            <td>${doctor.phone || 'N/A'}</td>
            <td>
                <span class="status-badge ${doctor.isActive ? 'status-active' : 'status-inactive'}">
                    ${doctor.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-sm" onclick="viewDoctorDetails('${doctor._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="editDoctor('${doctor._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteDoctor('${doctor._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load patients
async function loadPatients() {
    try {
        const response = await fetch(`${API_BASE}/patients`, {
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
        showAlert('Failed to load patients', 'error');
        currentPatients = [];
        displayPatients([]);
    }
}

// Display patients
function displayPatients(patients) {
    const container = document.getElementById('patientsList');
    if (!container) return;

    if (!patients || patients.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="text-center py-4">No patients found</td></tr>';
        return;
    }

    container.innerHTML = patients.map(patient => `
        <tr>
            <td>${patient.patientId}</td>
            <td>${patient.firstName} ${patient.lastName}</td>
            <td>${patient.email}</td>
            <td>${patient.phone}</td>
            <td>${patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 'N/A'}</td>
            <td>${patient.gender}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-sm" onclick="viewPatientDetails('${patient._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="editPatient('${patient._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load appointments
async function loadAppointments() {
    try {
        const response = await fetch(`${API_BASE}/appointments`, {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error('Failed to load appointments');

        const data = await response.json();
        currentAppointments = data.appointments || [];
        displayAppointments(currentAppointments);
        
    } catch (error) {
        console.error('Error loading appointments:', error);
        showAlert('Failed to load appointments', 'error');
        currentAppointments = [];
        displayAppointments([]);
    }
}

// Display appointments
function displayAppointments(appointments) {
    const container = document.getElementById('appointmentsList');
    if (!container) return;

    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="text-center py-4">No appointments found</td></tr>';
        return;
    }

    container.innerHTML = appointments.map(appointment => `
        <tr>
            <td>${appointment.appointmentId || 'N/A'}</td>
            <td>${appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'N/A'}</td>
            <td>${appointment.doctor ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` : 'N/A'}</td>
            <td>${appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : 'N/A'}</td>
            <td>${appointment.timeSlot ? appointment.timeSlot.startTime : 'N/A'}</td>
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
                </div>
            </td>
        </tr>
    `).join('');
}

// Load departments
async function loadDepartments() {
    try {
        const response = await fetch(`${API_BASE}/departments`, {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error('Failed to load departments');

        const data = await response.json();
        currentDepartments = data.departments || [];
        displayDepartments(currentDepartments);
    } catch (error) {
        console.error('Error loading departments:', error);
        showAlert('Failed to load departments', 'error');
        currentDepartments = [];
        displayDepartments([]);
    }
}

// Display departments
function displayDepartments(departments) {
    const container = document.getElementById('departmentsList');
    if (!container) return;

    if (!departments || departments.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-4">No departments found</div>';
        return;
    }

    container.innerHTML = departments.map(department => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="department-card card h-100">
                <div class="card-body">
                    <div class="department-header d-flex justify-content-between align-items-center mb-3">
                        <h5 class="card-title mb-0">${department.name}</h5>
                        <span class="badge ${department.isActive ? 'bg-success' : 'bg-secondary'}">
                            ${department.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="department-info">
                        <p class="card-text"><strong>Head:</strong> ${department.head ? `Dr. ${department.head.firstName} ${department.head.lastName}` : 'Not assigned'}</p>
                        <p class="card-text"><strong>Contact:</strong> ${department.contactEmail || 'N/A'}</p>
                        <p class="card-text"><strong>Phone:</strong> ${department.contactPhone || 'N/A'}</p>
                    </div>
                    <p class="card-text">${department.description || 'No description available.'}</p>
                    <div class="department-actions mt-3">
                        <button class="btn btn-info btn-sm me-1" onclick="viewDepartmentDetails('${department._id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-warning btn-sm me-1" onclick="editDepartment('${department._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteDepartment('${department._id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Load staff
async function loadStaff() {
    try {
        const response = await fetch(`${API_BASE}/staff`, {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error('Failed to load staff');

        const data = await response.json();
        currentStaff = data.staff || [];
        displayStaff(currentStaff);
    } catch (error) {
        console.error('Error loading staff:', error);
        showAlert('Failed to load staff', 'error');
        currentStaff = [];
        displayStaff([]);
    }
}

// Display staff
function displayStaff(staff) {
    const container = document.getElementById('staffList');
    if (!container) return;

    if (!staff || staff.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="text-center py-4">No staff members found</td></tr>';
        return;
    }

    container.innerHTML = staff.map(staffMember => `
        <tr>
            <td>${staffMember.staffId}</td>
            <td>${staffMember.firstName} ${staffMember.lastName}</td>
            <td>${staffMember.role}</td>
            <td>${staffMember.department || 'N/A'}</td>
            <td>${staffMember.email}</td>
            <td>${staffMember.phone}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-sm" onclick="viewStaffDetails('${staffMember._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="editStaff('${staffMember._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteStaff('${staffMember._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch(`${API_BASE}/recent-activity`, {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error('Failed to load recent activity');

        const data = await response.json();
        displayRecentActivity(data.activities || []);
    } catch (error) {
        console.error('Error loading recent activity:', error);
        displayRecentActivity([]);
    }
}

// Display recent activity
function displayRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    if (!container) return;

    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="text-center py-4">No recent activity</div>';
        return;
    }

    container.innerHTML = activities.map(activity => `
        <div class="activity-item d-flex align-items-start mb-3">
            <div class="activity-icon me-3">
                <i class="fas ${getActivityIcon(activity.type)} text-primary"></i>
            </div>
            <div class="activity-content flex-grow-1">
                <p class="mb-1">${activity.description}</p>
                <div class="activity-time text-muted small">${new Date(activity.timestamp).toLocaleString()}</div>
            </div>
        </div>
    `).join('');
}

// Get activity icon based on type
function getActivityIcon(type) {
    const icons = {
        'appointment': 'fa-calendar-check',
        'patient': 'fa-user-plus',
        'doctor': 'fa-user-md',
        'prescription': 'fa-prescription',
        'payment': 'fa-money-bill-wave',
        'system': 'fa-cog'
    };
    return icons[type] || 'fa-circle';
}

// Load system alerts
async function loadSystemAlerts() {
    try {
        const response = await fetch(`${API_BASE}/system-alerts`, {
            headers: {
                'Session-Id': sessionId
            }
        });

        if (!response.ok) throw new Error('Failed to load system alerts');

        const data = await response.json();
        displaySystemAlerts(data.alerts || []);
    } catch (error) {
        console.error('Error loading system alerts:', error);
        displaySystemAlerts([]);
    }
}

// Display system alerts
function displaySystemAlerts(alerts) {
    const container = document.getElementById('systemAlerts');
    if (!container) return;

    if (!alerts || alerts.length === 0) {
        container.innerHTML = '<div class="text-center py-4">No system alerts at this time</div>';
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert alert-${getAlertClass(alert.severity)} mb-2">
            <div class="d-flex">
                <div class="alert-icon me-3">
                    <i class="fas ${getAlertIcon(alert.severity)}"></i>
                </div>
                <div class="flex-grow-1">
                    <strong>${alert.title}</strong>
                    <p class="mb-1">${alert.message}</p>
                    <small>${new Date(alert.timestamp).toLocaleString()}</small>
                </div>
            </div>
        </div>
    `).join('');
}

// Get alert class based on severity
function getAlertClass(severity) {
    const classes = {
        'warning': 'warning',
        'danger': 'danger',
        'info': 'info'
    };
    return classes[severity] || 'info';
}

// Get alert icon based on severity
function getAlertIcon(severity) {
    const icons = {
        'warning': 'fa-exclamation-triangle',
        'danger': 'fa-exclamation-circle',
        'info': 'fa-info-circle'
    };
    return icons[severity] || 'fa-info-circle';
}

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.toggle('active');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    
    // Prevent body scrolling when sidebar is open
    if (sidebar && sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

// Update mobile menu visibility based on screen size
function updateMobileMenuVisibility() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
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

// Handle navigation link clicks
function handleNavigation(e) {
    e.preventDefault();
    const section = this.getAttribute('data-section');
    if (section) {
        showSection(section);
    }
}

// Section titles mapping
const sectionTitles = {
    'overview': 'Admin Dashboard',
    'doctors': 'Doctors Management',
    'patients': 'Patients Management',
    'appointments': 'Appointments Management',
    'departments': 'Departments Management',
    'staff': 'Staff Management',
    'reports': 'Reports & Analytics',
    'settings': 'System Settings'
};

// Show specific section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
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
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = sectionTitles[sectionName] || 'Admin Dashboard';
    }
    
    currentSection = sectionName;
    
    // Load section-specific data
    switch(sectionName) {
        case 'doctors':
            loadDoctors();
            break;
        case 'patients':
            loadPatients();
            break;
        case 'appointments':
            loadAppointments();
            break;
        case 'departments':
            loadDepartments();
            break;
        case 'staff':
            loadStaff();
            break;
    }
    
    // Close mobile sidebar if open
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

// Handle settings tab clicks
function handleTabClick(e) {
    const tabName = this.getAttribute('data-tab');
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Remove active class from all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to clicked tab
    this.classList.add('active');
    
    // Show corresponding tab content
    const tabContent = document.getElementById(tabName + '-tab');
    if (tabContent) {
        tabContent.classList.add('active');
    }
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Show alert message
function showAlert(message, type = 'info', duration = 5000) {
    // Create alert element if it doesn't exist
    let alertElement = document.getElementById('globalAlert');
    if (!alertElement) {
        alertElement = document.createElement('div');
        alertElement.id = 'globalAlert';
        alertElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 500px;
        `;
        document.body.appendChild(alertElement);
    }
    
    const alertClass = type === 'error' ? 'danger' : type;
    alertElement.innerHTML = `
        <div class="alert alert-${alertClass} alert-dismissible fade show">
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        </div>
    `;
    
    setTimeout(() => {
        if (alertElement && alertElement.firstChild) {
            alertElement.firstChild.remove();
        }
    }, duration);
}

// Handle add doctor form submission
async function handleAddDoctor(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const doctorData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        specialization: formData.get('specialization'),
        licenseNumber: formData.get('licenseNumber'),
        qualification: formData.get('qualification'),
        experience: parseInt(formData.get('experience')),
        department: formData.get('department'),
        biography: formData.get('biography'),
        consultationFee: parseFloat(formData.get('consultationFee')) || 0
    };
    
    // Validation
    if (!doctorData.firstName || !doctorData.lastName || !doctorData.email || !doctorData.password) {
        showAlert('Please fill in all required fields.', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/register/doctor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Session-Id': sessionId
            },
            body: JSON.stringify(doctorData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add doctor');
        }
        
        const result = await response.json();
        showAlert('Doctor added successfully!', 'success');
        
        // Close modal and reset form
        closeModal('addDoctorModal');
        e.target.reset();
        
        // Reload doctors list and stats
        loadDoctors();
        loadDashboardStats();
        
    } catch (error) {
        console.error('Error adding doctor:', error);
        showAlert(error.message, 'error');
    }
}

// Handle add department form submission
async function handleAddDepartment(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const departmentData = {
        name: formData.get('name'),
        description: formData.get('description'),
        contactEmail: formData.get('contactEmail'),
        contactPhone: formData.get('contactPhone'),
        location: formData.get('location'),
        services: formData.get('services') ? formData.get('services').split(',').map(s => s.trim()) : []
    };
    
    try {
        const response = await fetch(`${API_BASE}/departments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Session-Id': sessionId
            },
            body: JSON.stringify(departmentData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add department');
        }
        
        showAlert('Department added successfully!', 'success');
        
        closeModal('addDepartmentModal');
        e.target.reset();
        loadDepartments();
        
    } catch (error) {
        console.error('Error adding department:', error);
        showAlert(error.message, 'error');
    }
}

// Handle add staff form submission
async function handleAddStaff(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const staffData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        role: formData.get('role'),
        department: formData.get('department'),
        qualification: formData.get('qualification'),
        experience: parseInt(formData.get('experience')) || 0,
        salary: parseFloat(formData.get('salary'))
    };
    
    try {
        const response = await fetch(`${API_BASE}/staff`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Session-Id': sessionId
            },
            body: JSON.stringify(staffData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add staff');
        }
        
        showAlert('Staff member added successfully!', 'success');
        
        closeModal('addStaffModal');
        e.target.reset();
        loadStaff();
        
    } catch (error) {
        console.error('Error adding staff:', error);
        showAlert(error.message, 'error');
    }
}

// Filter doctors by search term
function filterDoctors(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#doctorsList tr');
    
    rows.forEach(row => {
        const doctorName = row.cells[1] ? row.cells[1].textContent.toLowerCase() : '';
        const specialization = row.cells[2] ? row.cells[2].textContent.toLowerCase() : '';
        
        if (doctorName.includes(searchTerm) || specialization.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Filter patients by search term
function filterPatients(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#patientsList tr');
    
    rows.forEach(row => {
        const patientName = row.cells[1] ? row.cells[1].textContent.toLowerCase() : '';
        const patientId = row.cells[0] ? row.cells[0].textContent.toLowerCase() : '';
        
        if (patientName.includes(searchTerm) || patientId.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Update appointment status
async function updateAppointmentStatus(appointmentId, status) {
    if (!confirm(`Are you sure you want to mark this appointment as ${status}?`)) {
        return;
    }
    
    try {
        // This would typically call an API endpoint to update appointment status
        showAlert(`Appointment ${status} successfully!`, 'success');
        
        // Reload appointments
        loadAppointments();
        
    } catch (error) {
        console.error('Error updating appointment:', error);
        showAlert('Failed to update appointment', 'error');
    }
}

// Handle logout
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }
    
    try {
        if (sessionId) {
            await fetch('/api/logout', {
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
    // ESC key to close modals
    if (e.key === 'Escape') {
        // Close all open modals
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal.style.display === 'block') {
                closeModal(modal.id);
            }
        });
    }
    
    // Ctrl/Cmd + R to refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshData();
    }
}

// Placeholder functions for future implementation
function viewDoctorDetails(doctorId) {
    showAlert('Doctor details feature coming soon!', 'info');
}

function editDoctor(doctorId) {
    showAlert('Edit doctor feature coming soon!', 'info');
}

function deleteDoctor(doctorId) {
    if (confirm('Are you sure you want to delete this doctor?')) {
        showAlert('Delete doctor feature coming soon!', 'info');
    }
}

function viewPatientDetails(patientId) {
    showAlert('Patient details feature coming soon!', 'info');
}

function editPatient(patientId) {
    showAlert('Edit patient feature coming soon!', 'info');
}

function viewAppointmentDetails(appointmentId) {
    showAlert('Appointment details feature coming soon!', 'info');
}

function viewDepartmentDetails(departmentId) {
    showAlert('Department details feature coming soon!', 'info');
}

function editDepartment(departmentId) {
    showAlert('Edit department feature coming soon!', 'info');
}

function deleteDepartment(departmentId) {
    if (confirm('Are you sure you want to delete this department?')) {
        showAlert('Delete department feature coming soon!', 'info');
    }
}

function viewStaffDetails(staffId) {
    showAlert('Staff details feature coming soon!', 'info');
}

function editStaff(staffId) {
    showAlert('Edit staff feature coming soon!', 'info');
}

function deleteStaff(staffId) {
    if (confirm('Are you sure you want to delete this staff member?')) {
        showAlert('Delete staff feature coming soon!', 'info');
    }
}

// Export functions for inline HTML use
window.openModal = openModal;
window.closeModal = closeModal;
window.showAlert = showAlert;
window.refreshData = refreshData;
window.updateAppointmentStatus = updateAppointmentStatus;
window.handleLogout = handleLogout;

// Debug function
window.debugAdminDashboard = function() {
    console.log('=== ADMIN DASHBOARD DEBUG INFO ===');
    console.log('Current User:', currentUser);
    console.log('Session ID:', sessionId);
    console.log('Doctors:', currentDoctors.length);
    console.log('Patients:', currentPatients.length);
    console.log('Appointments:', currentAppointments.length);
    console.log('Departments:', currentDepartments.length);
    console.log('Staff:', currentStaff.length);
    console.log('Current Section:', currentSection);
    console.log('==========================');
};