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
// IMPORTANT: Add this BEFORE other middleware
app.use(express.static(path.join(__dirname)));

app.use(express.json());

// 1. Security middleware to block sensitive files - FIRST!
app.use((req, res, next) => {
    const sensitiveFiles = ['/server.js', '/.env', '/package.json', '/package-lock.json'];
    if (sensitiveFiles.includes(req.path)) {
        console.log(`🚫 Blocked access to sensitive file: ${req.path}`);
        return res.status(403).json({ error: 'Access forbidden' });
    }
    next();
});

// 2. Static file serving - ONLY ONCE!
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

// 5. CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Session-Id']
}));

// 6. Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 10000
}));

// 7. Compression
app.use(compression());

// 8. Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// ==================== DATABASE CONNECTION ====================
// ✅ MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing. Please set it in Render Environment Variables.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

// ==================== ENHANCED SCHEMAS ====================

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
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    specialization: { 
        type: String, 
        required: true, 
        trim: true,
        enum: ['Cardiology', 'Neurology', 'General Medicine', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Psychiatry']
    },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    qualification: { type: String, required: true, trim: true },
    experience: { type: Number, required: true, min: 0 },
    department: { type: String, required: true, trim: true },
    biography: { type: String, trim: true },
    consultationFee: { type: Number, min: 0 },
    availableDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
    availableTimeSlots: { type: String, trim: true },
    availability: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        startTime: String,
        endTime: String
    }],
    profileImage: { type: String, default: null },
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
    accessLevel: { 
        type: String, 
        required: true, 
        enum: ['super_admin', 'admin', 'manager'],
        default: 'admin'
    },
    permissions: {
        manageUsers: { type: Boolean, default: true },
        manageDoctors: { type: Boolean, default: true },
        manageAppointments: { type: Boolean, default: true },
        viewReports: { type: Boolean, default: true },
        manageSettings: { type: Boolean, default: false }
    },
    isActive: { type: Boolean, default: true },
    role: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Enhanced Patient Schema
const patientSchema = new mongoose.Schema({
    patientId: {
        type: String,
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String
    },
    medicalHistory: {
        allergies: [String],
        chronicConditions: [String],
        previousSurgeries: [{
            surgery: String,
            date: Date,
            notes: String
        }],
        currentMedications: [String]
    },
    profileImage: {
        type: String,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    registeredDate: {
        type: Date,
        default: Date.now
    },
    lastVisit: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
    appointmentId: {
        type: String,
        required: true,
        unique: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    appointmentDate: {
        type: Date,
        required: true
    },
    timeSlot: {
        startTime: {
            type: String,
            required: true
        },
        endTime: {
            type: String,
            required: true
        }
    },
    appointmentType: {
        type: String,
        enum: ['Consultation', 'Follow-up', 'Emergency', 'Routine Checkup'],
        required: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled', 'pending', 'rescheduled'],
        default: 'scheduled'
    },
    symptoms: {
        type: String,
        required: true
    },
    diagnosis: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: null
    },
    cancelReason: {
        type: String,
        default: null
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'refunded'],
        default: 'pending'
    },
    amount: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Prescription Schema
const prescriptionSchema = new mongoose.Schema({
    prescriptionId: {
        type: String,
        required: true,
        unique: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        default: null
    },
    medications: [{
        name: {
            type: String,
            required: true
        },
        dosage: {
            type: String,
            required: true
        },
        frequency: {
            type: String,
            required: true
        },
        duration: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        instructions: String
    }],
    diagnosis: {
        type: String,
        required: true
    },
    additionalNotes: String,
    issuedDate: {
        type: Date,
        default: Date.now
    },
    validUntil: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'cancelled'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Medical Record Schema
const medicalRecordSchema = new mongoose.Schema({
    recordId: {
        type: String,
        required: true,
        unique: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    recordType: {
        type: String,
        enum: ['Lab Result', 'X-Ray', 'MRI', 'CT Scan', 'Blood Test', 'Prescription', 'Diagnosis', 'Other'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    findings: String,
    fileUrl: String,
    fileType: String,
    uploadedDate: {
        type: Date,
        default: Date.now
    },
    isConfidential: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Review Schema
const reviewSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        maxlength: 500
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    recipientType: {
        type: String,
        enum: ['Doctor', 'Patient'],
        required: true
    },
    type: {
        type: String,
        enum: ['appointment', 'prescription', 'reminder', 'cancellation', 'system'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
    paymentId: {
        type: String,
        required: true,
        unique: true
    },
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['credit_card', 'debit_card', 'paypal', 'stripe', 'cash'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    transactionId: String,
    paymentDate: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const loginSessionSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        refPath: 'userModel'
    },
    userModel: {
        type: String,
        required: true,
        enum: ['User', 'Doctor', 'Admin', 'Patient']
    },
    email: { type: String, required: true },
    role: { 
        type: String, 
        required: true, 
        enum: ['patient', 'doctor', 'admin'] 
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    loginTime: { type: Date, default: Date.now },
    logoutTime: { type: Date },
    isActive: { type: Boolean, default: true },
    token: { type: String },
    expiresAt: { type: Date }
});

loginSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for better query performance
doctorSchema.index({ email: 1, specialization: 1 });
patientSchema.index({ email: 1, patientId: 1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1, status: 1 });
prescriptionSchema.index({ doctor: 1, patient: 1, issuedDate: -1 });
medicalRecordSchema.index({ patient: 1, recordType: 1 });

// Pre-save middleware to update timestamps
const updateTimestamp = function(next) {
    this.updatedAt = Date.now();
    next();
};

const hashPasswordMiddleware = async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
};

userSchema.pre('save', hashPasswordMiddleware);
doctorSchema.pre('save', hashPasswordMiddleware);
adminSchema.pre('save', hashPasswordMiddleware);
patientSchema.pre('save', hashPasswordMiddleware);

doctorSchema.pre('save', updateTimestamp);
patientSchema.pre('save', updateTimestamp);
appointmentSchema.pre('save', updateTimestamp);
prescriptionSchema.pre('save', updateTimestamp);

// Virtual for full name
doctorSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

patientSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

patientSchema.virtual('age').get(function() {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

const comparePasswordMethod = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.comparePassword = comparePasswordMethod;
doctorSchema.methods.comparePassword = comparePasswordMethod;
adminSchema.methods.comparePassword = comparePasswordMethod;
patientSchema.methods.comparePassword = comparePasswordMethod;

const User = mongoose.model('User', userSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Patient = mongoose.model('Patient', patientSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Prescription = mongoose.model('Prescription', prescriptionSchema);
const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);
const Review = mongoose.model('Review', reviewSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Payment = mongoose.model('Payment', paymentSchema);
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
        }).populate('userId');

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        req.session = session;
        req.user = session.userId;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// JWT Authentication Middleware
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // For now, we'll use session-based auth, but you can integrate JWT later
        // This is a placeholder for JWT implementation
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

// ==================== UPDATED HTML PAGE ROUTES ====================
// Updated to match your folder structure: Public/Dashboard/[dashboard-type]/

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'home', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Registration','Registration.html'));
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

// ==================== UPDATED DASHBOARD ROUTES ====================
// Updated to match: Public/Dashboard/[dashboard-type]/[dashboard-file].html

// Patient Dashboard
app.get('/patient-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Dashboard', 'patient-dashboard', 'patient-dashboard.html'));
});

// Doctor Dashboard
app.get('/doctor-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Dashboard', 'doctor-dashboard', 'doctor-dashboard.html'));
});

// Admin Dashboard
app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'Dashboard', 'admin-dashboard', 'admin-dashboard.html'));
});

// ==================== STATIC FILE SERVING ====================

// Serve dashboard static files (CSS, JS, images) from the Dashboard folder
app.use('/Dashboard', express.static(path.join(__dirname, 'Public', 'Dashboard')));

// Serve registration static files
app.use('/Registration', express.static(path.join(__dirname, 'Public', 'Registration')));

// Serve login static files
app.use('/login', express.static(path.join(__dirname, 'Public', 'login')));

// Serve home static files
app.use('/', express.static(path.join(__dirname, 'Public', 'home')));

// ==================== REDIRECT ROUTES FOR OLD URLS ====================

// Redirect old .html URLs to new clean URLs
app.get('/patient-dashboard.html', (req, res) => {
    res.redirect('/patient-dashboard');
});

app.get('/doctor-dashboard.html', (req, res) => {
    res.redirect('/doctor-dashboard');
});

app.get('/admin-dashboard.html', (req, res) => {
    res.redirect('/admin-dashboard');
});

app.get('/home.html', (req, res) => {
    res.redirect('/');
});

app.get('/login.html', (req, res) => {
    res.redirect('/login');
});

// ==================== ENHANCED API ROUTES ====================
// (All your existing API routes remain exactly the same)

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Server is running',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Existing registration routes (keep as is)
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
            user: { id: user._id, username: user.username, email: user.email, 
                   firstName: user.firstName, lastName: user.lastName, role: user.role }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

app.post('/api/register/doctor', async (req, res) => {
    try {
        const {
            username, email, password, firstName, lastName, phone, dateOfBirth, gender,
            specialization, licenseNumber, qualification, experience, department,
            biography, consultationFee, availableDays, availableTimeSlots
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
            dateOfBirth: dateOfBirth || null, gender: gender || '',
            specialization, licenseNumber, qualification, experience, department,
            biography: biography || '', consultationFee: consultationFee || 0,
            availableDays: availableDays || [], availableTimeSlots: availableTimeSlots || ''
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
            employeeId, department, position, accessLevel, permissions
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
            accessLevel: accessLevel || 'admin',
            permissions: permissions || {}
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

// Enhanced Patient Registration
app.post('/api/register/patient', async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, dateOfBirth, gender, bloodGroup, address } = req.body;
        
        // Check if patient already exists
        const existingPatient = await Patient.findOne({ email });
        if (existingPatient) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Generate unique patient ID
        const patientCount = await Patient.countDocuments();
        const patientId = `P${String(patientCount + 1).padStart(4, '0')}`;
        
        // Create new patient
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
                fullName: patient.fullName,
                email: patient.email
            }
        });
    } catch (error) {
        console.error('Patient registration error:', error);
        res.status(500).json({ error: 'Patient registration failed', details: error.message });
    }
});

// Enhanced Login with Patient Support
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        let user;
        let userModel;
        const emailLower = email.toLowerCase();

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

        const session = new LoginSession({
            userId: user._id,
            userModel: userModel,
            email: user.email,
            role: user.role || userType,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            loginTime: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
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

app.get('/api/profile', authenticateSession, async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            role: req.session.role
        }
    });
});

// ==================== DOCTOR DASHBOARD ROUTES ====================

// Get Doctor Profile
app.get('/api/doctor/profile', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'doctor') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const doctor = await Doctor.findById(req.user._id).select('-password');
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.json(doctor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Doctor Profile
app.put('/api/doctor/profile', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'doctor') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updates = req.body;
        delete updates.password;
        delete updates.email;
        
        const doctor = await Doctor.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');
        
        res.json({
            message: 'Profile updated successfully',
            doctor
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Doctor Dashboard Stats
app.get('/api/doctor/dashboard/stats', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'doctor') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const [
            todayAppointments,
            totalPatients,
            todayPrescriptions,
            pendingAppointments
        ] = await Promise.all([
            Appointment.countDocuments({
                doctor: req.user._id,
                appointmentDate: { $gte: today, $lt: tomorrow }
            }),
            Appointment.distinct('patient', { doctor: req.user._id }).then(ids => ids.length),
            Prescription.countDocuments({
                doctor: req.user._id,
                issuedDate: { $gte: today, $lt: tomorrow }
            }),
            Appointment.countDocuments({
                doctor: req.user._id,
                status: 'pending'
            })
        ]);
        
        res.json({
            todayAppointments,
            totalPatients,
            todayPrescriptions,
            pendingAppointments
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== APPOINTMENT ROUTES ====================

// Get All Appointments for Doctor
app.get('/api/doctor/appointments', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'doctor') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { status, date, page = 1, limit = 10 } = req.query;
        
        const query = { doctor: req.user._id };
        
        if (status) {
            query.status = status;
        }
        
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.appointmentDate = { $gte: startDate, $lte: endDate };
        }
        
        const appointments = await Appointment.find(query)
            .populate('patient', 'firstName lastName email phone patientId')
            .sort({ appointmentDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const count = await Appointment.countDocuments(query);
        
        res.json({
            appointments,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Appointment Status
app.patch('/api/doctor/appointments/:appointmentId/status', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'doctor') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { status, diagnosis, notes } = req.body;
        
        const appointment = await Appointment.findOneAndUpdate(
            { _id: req.params.appointmentId, doctor: req.user._id },
            { status, diagnosis, notes },
            { new: true }
        ).populate('patient', 'firstName lastName email');
        
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        // Create notification for patient
        await Notification.create({
            recipient: appointment.patient._id,
            recipientType: 'Patient',
            type: 'appointment',
            title: 'Appointment Status Updated',
            message: `Your appointment status has been updated to ${status}`,
            relatedId: appointment._id
        });
        
        res.json({
            message: 'Appointment updated successfully',
            appointment
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PATIENT ROUTES ====================

// Get All Patients for Doctor
app.get('/api/doctor/patients', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'doctor') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { search, page = 1, limit = 10 } = req.query;
        
        // Get unique patient IDs from appointments
        const appointmentPatients = await Appointment.distinct('patient', { doctor: req.user._id });
        
        const query = { _id: { $in: appointmentPatients } };
        
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { patientId: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        const patients = await Patient.find(query)
            .select('-password')
            .sort({ lastVisit: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const count = await Patient.countDocuments(query);
        
        res.json({
            patients,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PRESCRIPTION ROUTES ====================

// Create Prescription
app.post('/api/doctor/prescriptions', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'doctor') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { patientId, appointmentId, medications, diagnosis, additionalNotes, validDays = 30 } = req.body;
        
        // Generate unique prescription ID
        const prescriptionCount = await Prescription.countDocuments();
        const prescriptionId = `RX${String(prescriptionCount + 1).padStart(6, '0')}`;
        
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + validDays);
        
        const prescription = new Prescription({
            prescriptionId,
            doctor: req.user._id,
            patient: patientId,
            appointment: appointmentId || null,
            medications,
            diagnosis,
            additionalNotes,
            validUntil
        });
        
        await prescription.save();
        await prescription.populate('patient', 'firstName lastName patientId');
        
        // Create notification for patient
        await Notification.create({
            recipient: patientId,
            recipientType: 'Patient',
            type: 'prescription',
            title: 'New Prescription Issued',
            message: 'A new prescription has been issued for you',
            relatedId: prescription._id
        });
        
        res.status(201).json({
            message: 'Prescription created successfully',
            prescription
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PATIENT DASHBOARD ROUTES ====================

// Book Appointment (Patient)
app.post('/api/patient/appointments', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'patient') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { doctorId, appointmentDate, timeSlot, appointmentType, symptoms } = req.body;
        
        // Check if time slot is available
        const existingAppointment = await Appointment.findOne({
            doctor: doctorId,
            appointmentDate,
            'timeSlot.startTime': timeSlot.startTime,
            status: { $ne: 'cancelled' }
        });
        
        if (existingAppointment) {
            return res.status(400).json({ error: 'Time slot not available' });
        }
        
        // Get doctor consultation fee
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        
        // Generate unique appointment ID
        const appointmentCount = await Appointment.countDocuments();
        const appointmentId = `APT${String(appointmentCount + 1).padStart(6, '0')}`;
        
        const appointment = new Appointment({
            appointmentId,
            doctor: doctorId,
            patient: req.user._id,
            appointmentDate,
            timeSlot,
            appointmentType,
            symptoms,
            amount: doctor.consultationFee
        });
        
        await appointment.save();
        await appointment.populate('doctor', 'firstName lastName specialization');
        
        // Create notification for doctor
        await Notification.create({
            recipient: doctorId,
            recipientType: 'Doctor',
            type: 'appointment',
            title: 'New Appointment Request',
            message: `New appointment request from patient`,
            relatedId: appointment._id
        });
        
        res.status(201).json({
            message: 'Appointment booked successfully',
            appointment
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Patient Appointments
app.get('/api/patient/appointments', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'patient') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { status, page = 1, limit = 10 } = req.query;
        
        const query = { patient: req.user._id };
        
        if (status) {
            query.status = status;
        }
        
        const appointments = await Appointment.find(query)
            .populate('doctor', 'firstName lastName specialization consultationFee')
            .sort({ appointmentDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const count = await Appointment.countDocuments(query);
        
        res.json({
            appointments,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Patient Profile
app.get('/api/patient/profile', authenticateSession, async (req, res) => {
    try {
        if (req.session.role !== 'patient') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const patient = await Patient.findById(req.user._id).select('-password');
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json(patient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== SEARCH ROUTES ====================

// Search Doctors
app.get('/api/search/doctors', async (req, res) => {
    try {
        const { specialization, name, page = 1, limit = 10 } = req.query;
        
        const query = { isActive: true };
        
        if (specialization) {
            query.specialization = specialization;
        }
        
        if (name) {
            query.$or = [
                { firstName: { $regex: name, $options: 'i' } },
                { lastName: { $regex: name, $options: 'i' } }
            ];
        }
        
        const doctors = await Doctor.find(query)
            .select('-password')
            .sort({ experience: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const count = await Doctor.countDocuments(query);
        
        res.json({
            doctors,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available doctors
app.get('/api/doctors', async (req, res) => {
    try {
        const doctors = await Doctor.find({ isActive: true }).select('-password');
        res.json({ doctors });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
});

app.get('/api/admins', async (req, res) => {
    try {
        const admins = await Admin.find({ isActive: true }).select('-password');
        res.json({ admins });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});

// ==================== ERROR HANDLING (MUST BE LAST) ====================

app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

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
    
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token'
        });
    }
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 Mongo URI: ${MONGO_URI}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'Public')}`);
    console.log(`📊 Dashboard routes configured for: Public/Dashboard/`);
});