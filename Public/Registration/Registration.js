let selectedRole = 'patient';

// Role selection functionality with navigation
document.querySelectorAll('.role-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.role-option').forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        selectedRole = this.dataset.role;
        
        // Show success message when role is selected
        showAlert('success', 'Redirecting to ' + selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) + ' registration...');
        
        // Redirect to appropriate registration page after short delay
        setTimeout(() => {
    if (selectedRole === 'patient') {
        window.location.href = '/register/user';
    } else if (selectedRole === 'doctor') {
        window.location.href = '/register/doctor';
    } else if (selectedRole === 'admin') {
        window.location.href = '/register/admin';
    }
}, 1000);
    });
});

// Show/hide alerts
function showAlert(type, message) {
    const alertElement = document.getElementById(type + 'Alert');
    const messageElement = document.getElementById(type + 'Message');
    messageElement.textContent = message;
    alertElement.style.display = 'flex';
    
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 5000);
}

function hideAlerts() {
    document.getElementById('errorAlert').style.display = 'none';
    document.getElementById('successAlert').style.display = 'none';
}

// Role option animations
document.querySelectorAll('.role-option').forEach(option => {
    option.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px) scale(1.05)';
    });

    option.addEventListener('mouseleave', function() {
        if (!this.classList.contains('active')) {
            this.style.transform = 'translateY(0) scale(1)';
        }
    });
});

// Demo info (optional - remove if not needed)
// document.addEventListener('DOMContentLoaded', function() {
//     const demoInfo = document.createElement('div');
//     demoInfo.style.cssText = `
//         position: fixed;
//         bottom: 2rem;
//         right: 2rem;
//         background: rgba(255, 255, 255, 0.9);
//         padding: 1rem;
//         border-radius: 10px;
//         box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
//         font-size: 0.9rem;
//         max-width: 250px;
//         z-index: 1000;
//     `;
//     demoInfo.innerHTML = `
//         <strong style="color: #667eea;">Select Your Role:</strong><br>
//         <p style="margin-top: 0.5rem; color: #666;">
//         • Choose Patient, Doctor, or Admin<br>
//         • Your selection will be saved<br>
//         • Easy role switching
//         </p>
//     `;
//     document.body.appendChild(demoInfo);
// });