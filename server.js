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
  process.exit(1); // Stop app if DB URI is missing
}

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1); // Stop app if DB fails
  });

// ==================== SCHEMAS ====================

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
    specialization: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    qualification: { type: String, required: true, trim: true },
    experience: { type: Number, required: true, min: 0 },
    department: { type: String, required: true, trim: true },
    biography: { type: String, trim: true },
    consultationFee: { type: Number, min: 0 },
    availableDays: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
    availableTimeSlots: { type: String, trim: true },
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

const loginSessionSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        refPath: 'userModel'
    },
    userModel: {
        type: String,
        required: true,
        enum: ['User', 'Doctor', 'Admin']
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

const comparePasswordMethod = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.comparePassword = comparePasswordMethod;
doctorSchema.methods.comparePassword = comparePasswordMethod;
adminSchema.methods.comparePassword = comparePasswordMethod;

const User = mongoose.model('User', userSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);
const Admin = mongoose.model('Admin', adminSchema);
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

// ==================== HTML PAGE ROUTES ====================

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

// Add these dashboard routes (temporary redirect to home since dashboards don't exist)
app.get('/patient-dashboard.html', (req, res) => {
    res.redirect('/');
});

app.get('/doctor-dashboard.html', (req, res) => {
    res.redirect('/');
});

app.get('/admin-dashboard.html', (req, res) => {
    res.redirect('/');
});

// app.get('/home.html', (req, res) => {
//     res.redirect('/');
// });

// ==================== API ROUTES ====================

// app.get('/api/health', (req, res) => {
//     res.json({ 
//         status: 'ok', 
//         message: 'Server is running',
//         mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
//     });
// });

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
            role: user.role,
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
                username: user.username, 
                email: user.email,
                firstName: user.firstName, 
                lastName: user.lastName, 
                role: user.role
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
});