const express = require('express');
const path = require('path');
const app = express();
const fs = require('fs');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================
app.use(express.static(path.join(__dirname)));

app.use(express.json());

// 1. Security middleware to block sensitive files
app.use((req, res, next) => {
    const sensitiveFiles = ['/server.js', '/.env', '/package.json', '/package-lock.json'];
    if (sensitiveFiles.includes(req.path)) {
        console.log(`🚫 Blocked access to sensitive file: ${req.path}`);
        return res.status(403).json({ error: 'Access forbidden' });
    }
    next();
});

// 2. Static file serving - FIXED PATH
app.use(express.static(path.join(__dirname, 'Public')));

// 3. Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:3000", "ws://localhost:3000"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// 4. Rate limiting 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// 5. CORS - FIXED CONFIGURATION
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Session-Id']
}));

// 6. Body parsing middleware
app.use(express.json({ 
  limit: '10mb'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb'
}));

// 7. Compression
app.use(compression());

// 8. Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// ==================== DATABASE CONNECTION ====================
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing. Please set it in Environment Variables.");
  // Don't exit in production, allow the app to start without DB
  console.log("⚠️  Starting without database connection");
}

if (MONGO_URI) {
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    // Don't exit process, allow app to run without DB
  });
}

// ==================== SIMPLIFIED SCHEMAS ====================

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', ''] },
    address: { type: String, trim: true },
    role: { type: String, default: 'patient', enum: ['patient', 'doctor', 'admin'] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const doctorSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    qualification: { type: String, required: true, trim: true },
    experience: { type: Number, required: true, min: 0 },
    department: { type: String, required: true, trim: true },
    biography: { type: String, trim: true },
    consultationFee: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    role: { type: String, default: 'doctor' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, unique: true, trim: true },
    department: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    accessLevel: { type: String, default: 'admin', enum: ['super_admin', 'admin', 'manager'] },
    isActive: { type: Boolean, default: true },
    role: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const patientSchema = new mongoose.Schema({
    patientId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    address: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    registeredDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const appointmentSchema = new mongoose.Schema({
    appointmentId: { type: String, required: true, unique: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentDate: { type: Date, required: true },
    timeSlot: {
        startTime: { type: String, required: true },
        endTime: { type: String, required: true }
    },
    appointmentType: { type: String, enum: ['Consultation', 'Follow-up', 'Emergency', 'Routine Checkup'], default: 'Consultation' },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'pending', 'rescheduled'], default: 'scheduled' },
    symptoms: { type: String, required: true },
    diagnosis: { type: String },
    notes: { type: String },
    amount: { type: Number, required: true, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const departmentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    contactEmail: { type: String, required: true, lowercase: true },
    contactPhone: { type: String, required: true },
    location: { type: String, required: true },
    services: [String],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const staffSchema = new mongoose.Schema({
    staffId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, required: true, enum: ['receptionist', 'nurse', 'lab_technician', 'pharmacist', 'accountant', 'manager'] },
    department: { type: String, required: true },
    qualification: String,
    experience: { type: Number, default: 0 },
    salary: { type: Number, required: true },
    joinDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const loginSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userModel: { type: String, required: true, enum: ['User', 'Doctor', 'Admin', 'Patient', 'Staff'] },
    email: { type: String, required: true },
    role: { type: String, required: true, enum: ['patient', 'doctor', 'admin', 'staff'] },
    ipAddress: { type: String },
    userAgent: { type: String },
    loginTime: { type: Date, default: Date.now },
    logoutTime: { type: Date },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date }
});

// Pre-save middleware for password hashing
const hashPassword = async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
};

userSchema.pre('save', hashPassword);
doctorSchema.pre('save', hashPassword);
adminSchema.pre('save', hashPassword);
patientSchema.pre('save', hashPassword);
staffSchema.pre('save', hashPassword);

// Password comparison method
const comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.comparePassword = comparePassword;
doctorSchema.methods.comparePassword = comparePassword;
adminSchema.methods.comparePassword = comparePassword;
patientSchema.methods.comparePassword = comparePassword;
staffSchema.methods.comparePassword = comparePassword;

// Create models
const User = mongoose.model('User', userSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Patient = mongoose.model('Patient', patientSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Department = mongoose.model('Department', departmentSchema);
const Staff = mongoose.model('Staff', staffSchema);
const LoginSession = mongoose.model('LoginSession', loginSessionSchema);

// ==================== AUTH MIDDLEWARE ====================

const authenticateSession = async (req, res, next) => {
    try {
        const sessionId = req.headers['session-id'];
        
        if (!sessionId) {
            return res.status(401).json({ error: 'No session provided' });
        }

        const session = await LoginSession.findOne({
            _id: sessionId,
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        // Get user based on role and model
        let user;
        switch(session.userModel) {
            case 'Doctor':
                user = await Doctor.findById(session.userId);
                break;
            case 'Admin':
                user = await Admin.findById(session.userId);
                break;
            case 'Patient':
                user = await Patient.findById(session.userId);
                break;
            case 'User':
                user = await User.findById(session.userId);
                break;
            case 'Staff':
                user = await Staff.findById(session.userId);
                break;
            default:
                return res.status(401).json({ error: 'Invalid user type' });
        }

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.session = session;
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ==================== ROUTES ====================

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'home', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Registration', 'Registration.html'));
});

app.get('/register/doctor', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Registration', 'Doctor Registration', 'doctor-register.html'));
});

app.get('/register/user', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Registration', 'user registration', 'user-register.html'));
});

app.get('/register/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Registration', 'Admin Register', 'admin-register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'login', 'login.html'));
});

// Dashboard routes
app.get('/patient-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Dashboard', 'patient-dashboard', 'patient-dashboard.html'));
});

app.get('/doctor-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Dashboard', 'doctor-dashboard', 'doctor-dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Dashboard', 'admin-dashboard', 'admin-dashboard.html'));
});

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Registration routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, phone, dateOfBirth, gender, address } = req.body;

        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ 
                error: existingUser.email === email ? 'Email already registered' : 'Username already taken' 
            });
        }

        const user = new User({
            username, email, password, firstName, lastName,
            phone: phone || '', dateOfBirth: dateOfBirth || null,
            gender: gender || '', address: address || ''
        });

        await user.save();

        res.status(201).json({
            message: 'User registered successfully',
            user: { 
                id: user._id, 
                username: user.username, 
                email: user.email, 
                firstName: user.firstName, 
                lastName: user.lastName, 
                role: user.role 
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

app.post('/api/register/doctor', async (req, res) => {
    try {
        const {
            username, email, password, firstName, lastName, phone,
            specialization, licenseNumber, qualification, experience, department,
            biography, consultationFee
        } = req.body;

        if (!username || !email || !password || !firstName || !lastName || !phone ||
            !specialization || !licenseNumber || !qualification || !experience || !department) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        const existingDoctor = await Doctor.findOne({ 
            $or: [{ email }, { username }, { licenseNumber }] 
        });

        if (existingDoctor) {
            if (existingDoctor.email === email) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            if (existingDoctor.username === username) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            if (existingDoctor.licenseNumber === licenseNumber) {
                return res.status(400).json({ error: 'License number already registered' });
            }
        }

        const doctor = new Doctor({
            username, email, password, firstName, lastName, phone,
            specialization, licenseNumber, qualification, experience, department,
            biography: biography || '', consultationFee: consultationFee || 0
        });

        await doctor.save();

        res.status(201).json({
            message: 'Doctor registered successfully',
            doctor: {
                id: doctor._id, username: doctor.username, email: doctor.email,
                firstName: doctor.firstName, lastName: doctor.lastName,
                specialization: doctor.specialization, role: doctor.role
            }
        });
    } catch (error) {
        console.error('Doctor registration error:', error);
        res.status(500).json({ error: 'Doctor registration failed', details: error.message });
    }
});

app.post('/api/register/admin', async (req, res) => {
    try {
        const {
            username, email, password, firstName, lastName, phone,
            employeeId, department, position, accessLevel
        } = req.body;

        if (!username || !email || !password || !firstName || !lastName || 
            !phone || !employeeId || !department || !position) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        const existingAdmin = await Admin.findOne({ 
            $or: [{ email }, { username }, { employeeId }] 
        });

        if (existingAdmin) {
            if (existingAdmin.email === email) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            if (existingAdmin.username === username) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            if (existingAdmin.employeeId === employeeId) {
                return res.status(400).json({ error: 'Employee ID already registered' });
            }
        }

        const admin = new Admin({
            username, email, password, firstName, lastName, phone,
            employeeId, department, position,
            accessLevel: accessLevel || 'admin'
        });

        await admin.save();

        res.status(201).json({
            message: 'Admin registered successfully',
            admin: {
                id: admin._id, username: admin.username, email: admin.email,
                firstName: admin.firstName, lastName: admin.lastName,
                position: admin.position, role: admin.role, accessLevel: admin.accessLevel
            }
        });
    } catch (error) {
        console.error('Admin registration error:', error);
        res.status(500).json({ error: 'Admin registration failed', details: error.message });
    }
});

app.post('/api/register/patient', async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, dateOfBirth, gender, bloodGroup, address } = req.body;
        
        if (!firstName || !lastName || !email || !password || !phone || !dateOfBirth || !gender) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }
        
        const existingPatient = await Patient.findOne({ email });
        if (existingPatient) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Generate unique patient ID
        const patientCount = await Patient.countDocuments();
        const patientId = `P${String(patientCount + 1).padStart(4, '0')}`;
        
        const patient = new Patient({
            patientId,
            firstName,
            lastName,
            email,
            password,
            phone,
            dateOfBirth,
            gender,
            bloodGroup,
            address
        });
        
        await patient.save();
        
        res.status(201).json({
            message: 'Patient registered successfully',
            patient: {
                id: patient._id,
                patientId: patient.patientId,
                firstName: patient.firstName,
                lastName: patient.lastName,
                email: patient.email
            }
        });
    } catch (error) {
        console.error('Patient registration error:', error);
        res.status(500).json({ error: 'Patient registration failed', details: error.message });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        let user;
        let userModel;
        const emailLower = email.toLowerCase();

        // Find user based on type
        if (userType === 'doctor') {
            user = await Doctor.findOne({ email: emailLower });
            userModel = 'Doctor';
        } else if (userType === 'admin') {
            user = await Admin.findOne({ email: emailLower });
            userModel = 'Admin';
        } else if (userType === 'patient') {
            user = await Patient.findOne({ email: emailLower });
            userModel = 'Patient';
        } else {
            user = await User.findOne({ email: emailLower });
            userModel = 'User';
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Create login session
        const session = new LoginSession({
            userId: user._id,
            userModel: userModel,
            email: user.email,
            role: user.role || userType,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            loginTime: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

        await session.save();

        res.json({
            message: 'Login successful',
            user: {
                id: user._id, 
                username: user.username || user.email, 
                email: user.email,
                firstName: user.firstName, 
                lastName: user.lastName, 
                role: user.role || userType
            },
            sessionId: session._id
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// Logout route
app.post('/api/logout', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (sessionId) {
            await LoginSession.findByIdAndUpdate(sessionId, {
                logoutTime: new Date(),
                isActive: false
            });
        }
        
        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Profile route
app.get('/api/profile', authenticateSession, async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            username: req.user.username || req.user.email,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            role: req.session.role
        }
    });
});

// ==================== ADMIN API ROUTES ====================

// Admin dashboard stats
app.get('/api/admin/dashboard/stats', authenticateSession, requireAdmin, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const [
            totalDoctors,
            totalPatients,
            todayAppointments,
            totalAppointments
        ] = await Promise.all([
            Doctor.countDocuments({ isActive: true }),
            Patient.countDocuments({ isActive: true }),
            Appointment.countDocuments({
                appointmentDate: { $gte: today }
            }),
            Appointment.countDocuments()
        ]);
        
        res.json({
            totalDoctors,
            totalPatients,
            todayAppointments,
            totalAppointments,
            todayRevenue: 0 // Simplified for now
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all doctors for admin
app.get('/api/admin/doctors', authenticateSession, requireAdmin, async (req, res) => {
    try {
        const doctors = await Doctor.find().select('-password').sort({ createdAt: -1 });
        
        res.json({
            doctors,
            total: doctors.length
        });
    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all patients for admin
app.get('/api/admin/patients', authenticateSession, requireAdmin, async (req, res) => {
    try {
        const patients = await Patient.find().select('-password').sort({ registeredDate: -1 });
        
        res.json({
            patients,
            total: patients.length
        });
    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all appointments for admin
app.get('/api/admin/appointments', authenticateSession, requireAdmin, async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('doctor', 'firstName lastName specialization')
            .populate('patient', 'firstName lastName patientId')
            .sort({ appointmentDate: -1 });
        
        res.json({
            appointments,
            total: appointments.length
        });
    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all departments
app.get('/api/admin/departments', authenticateSession, requireAdmin, async (req, res) => {
    try {
        const departments = await Department.find()
            .populate('head', 'firstName lastName specialization')
            .sort({ name: 1 });
        
        res.json({
            departments,
            total: departments.length
        });
    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create department
app.post('/api/admin/departments', authenticateSession, requireAdmin, async (req, res) => {
    try {
        const { name, description, head, contactEmail, contactPhone, location, services } = req.body;
        
        const existingDepartment = await Department.findOne({ name });
        if (existingDepartment) {
            return res.status(400).json({ error: 'Department already exists' });
        }
        
        const department = new Department({
            name,
            description,
            head,
            contactEmail,
            contactPhone,
            location,
            services: services || []
        });
        
        await department.save();
        
        res.status(201).json({
            message: 'Department created successfully',
            department
        });
    } catch (error) {
        console.error('Create department error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all staff
app.get('/api/admin/staff', authenticateSession, requireAdmin, async (req, res) => {
    try {
        const staff = await Staff.find().select('-password').sort({ joinDate: -1 });
        
        res.json({
            staff,
            total: staff.length
        });
    } catch (error) {
        console.error('Get staff error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create staff
app.post('/api/admin/staff', authenticateSession, requireAdmin, async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, role, department, qualification, experience, salary } = req.body;
        
        const existingStaff = await Staff.findOne({ email });
        if (existingStaff) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const staffCount = await Staff.countDocuments();
        const staffId = `ST${String(staffCount + 1).padStart(4, '0')}`;
        
        const staff = new Staff({
            staffId,
            firstName,
            lastName,
            email,
            password,
            phone,
            role,
            department,
            qualification,
            experience: experience || 0,
            salary
        });
        
        await staff.save();
        
        res.status(201).json({
            message: 'Staff created successfully',
            staff: {
                id: staff._id,
                staffId: staff.staffId,
                firstName: staff.firstName,
                lastName: staff.lastName,
                email: staff.email,
                role: staff.role
            }
        });
    } catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Recent activity
app.get('/api/admin/recent-activity', authenticateSession, requireAdmin, async (req, res) => {
    try {
        // Simplified recent activity
        const activities = [
            {
                type: 'system',
                description: 'System started successfully',
                timestamp: new Date()
            }
        ];
        
        res.json({ activities });
    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({ error: error.message });
    }
});

// System alerts
app.get('/api/admin/system-alerts', authenticateSession, requireAdmin, async (req, res) => {
    try {
        const alerts = [
            {
                title: 'System Status',
                message: 'All systems operational',
                severity: 'info',
                timestamp: new Date()
            }
        ];
        
        res.json({ alerts });
    } catch (error) {
        console.error('System alerts error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== DOCTOR API ROUTES ====================

app.get('/api/doctor/profile', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'doctor') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const doctor = await Doctor.findById(req.user._id).select('-password');
        res.json(doctor);
    } catch (error) {
        console.error('Doctor profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/doctor/dashboard/stats', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'doctor') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const [
            todayAppointments,
            totalPatients,
            pendingAppointments
        ] = await Promise.all([
            Appointment.countDocuments({
                doctor: req.user._id,
                appointmentDate: { $gte: today }
            }),
            Appointment.distinct('patient', { doctor: req.user._id }).then(ids => ids.length),
            Appointment.countDocuments({
                doctor: req.user._id,
                status: 'pending'
            })
        ]);
        
        res.json({
            todayAppointments,
            totalPatients,
            pendingAppointments,
            todayPrescriptions: 0
        });
    } catch (error) {
        console.error('Doctor stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PATIENT API ROUTES ====================

app.get('/api/patient/profile', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'patient') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const patient = await Patient.findById(req.user._id).select('-password');
        res.json(patient);
    } catch (error) {
        console.error('Patient profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== UTILITY ROUTES ====================

// Get available doctors
app.get('/api/doctors', async (req, res) => {
    try {
        const doctors = await Doctor.find({ isActive: true }).select('-password');
        res.json({ doctors });
    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
});

// Search doctors
app.get('/api/search/doctors', async (req, res) => {
    try {
        const { specialization, name } = req.query;
        
        const query = { isActive: true };
        
        if (specialization) {
            query.specialization = new RegExp(specialization, 'i');
        }
        
        if (name) {
            query.$or = [
                { firstName: new RegExp(name, 'i') },
                { lastName: new RegExp(name, 'i') }
            ];
        }
        
        const doctors = await Doctor.find(query).select('-password');
        
        res.json({
            doctors,
            total: doctors.length
        });
    } catch (error) {
        console.error('Search doctors error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error Stack:', err.stack);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: Object.values(err.errors).map(e => e.message)
        });
    }
    
    if (err.code === 11000) {
        return res.status(400).json({
            error: 'Duplicate entry',
            field: Object.keys(err.keyPattern)[0]
        });
    }
    
    res.status(500).json({
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'Public')}`);
});