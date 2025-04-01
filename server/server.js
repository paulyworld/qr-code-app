const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const morgan = require('morgan');
const geoip = require('geoip-lite');
const useragent = require('express-useragent');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(useragent.express());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qrcode-generator')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // Log the full connection string (but remove password if present)
    const connectionString = (process.env.MONGODB_URI || 'mongodb://localhost:27017/qrcode-generator')
      .replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://$1:***@');
    console.log('Attempted connection to:', connectionString);
  });

// Define schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const qrCodeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  url: { type: String, required: true },
  shortId: { type: String, required: true, unique: true },
  qrImageData: { type: String },
  settings: {
    qrColor: String,
    bgColor: String,
    size: Number,
    includeMargin: Boolean,
    qrStyle: String,
    cornerStyle: String,
    hasLogo: Boolean
  },
  scans: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const scanLogSchema = new mongoose.Schema({
  qrCode: { type: mongoose.Schema.Types.ObjectId, ref: 'QRCode', required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
  location: {
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number
  },
  device: {
    type: String,
    browser: String,
    os: String,
    isMobile: Boolean,
    isTablet: Boolean,
    isDesktop: Boolean
  },
  referrer: String
});

// Create models
const User = mongoose.model('User', userSchema);
const QRCode = mongoose.model('QRCode', qrCodeSchema);
const ScanLog = mongoose.model('ScanLog', scanLogSchema);

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Generate a random short ID
const generateShortId = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Routes
// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await newUser.save();
    
    // Generate JWT
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/verify', authenticate, (req, res) => {
  res.json({ isAuthenticated: true, user: req.user });
});

// QR Code routes
app.post('/api/qrcodes', authenticate, async (req, res) => {
  try {
    const { name, url, qrImageData, settings } = req.body;
    
    // Generate a unique short ID
    let shortId;
    let isUnique = false;
    
    while (!isUnique) {
      shortId = generateShortId();
      const existingQR = await QRCode.findOne({ shortId });
      if (!existingQR) {
        isUnique = true;
      }
    }
    
    const newQRCode = new QRCode({
      user: req.user.id,
      name,
      url,
      shortId,
      qrImageData,
      settings
    });
    
    await newQRCode.save();
    
    res.status(201).json({
      message: 'QR Code saved successfully',
      qrCode: {
        id: newQRCode._id,
        name: newQRCode.name,
        url: newQRCode.url,
        shortId: newQRCode.shortId,
        createdAt: newQRCode.createdAt
      }
    });
  } catch (error) {
    console.error('QR Code creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/qrcodes', authenticate, async (req, res) => {
  try {
    const qrCodes = await QRCode.find({ user: req.user.id })
      .select('name url shortId scans createdAt')
      .sort({ createdAt: -1 });
    
    res.json({ qrCodes });
  } catch (error) {
    console.error('QR Codes fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/qrcodes/:id', authenticate, async (req, res) => {
  try {
    const qrCode = await QRCode.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!qrCode) {
      return res.status(404).json({ message: 'QR Code not found' });
    }
    
    res.json({ qrCode });
  } catch (error) {
    console.error('QR Code fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/qrcodes/:id', authenticate, async (req, res) => {
  try {
    const qrCode = await QRCode.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!qrCode) {
      return res.status(404).json({ message: 'QR Code not found' });
    }
    
    // Delete associated scan logs
    await ScanLog.deleteMany({ qrCode: req.params.id });
    
    res.json({ message: 'QR Code deleted successfully' });
  } catch (error) {
    console.error('QR Code deletion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// QR Code redirection and analytics
app.get('/q/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;
    
    const qrCode = await QRCode.findOne({ shortId });
    
    if (!qrCode) {
      return res.status(404).send('QR Code not found');
    }
    
    // Update scan count
    qrCode.scans += 1;
    await qrCode.save();
    
    // Log scan data
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const geo = geoip.lookup(ipAddress);
    
    const scanLog = new ScanLog({
      qrCode: qrCode._id,
      ipAddress,
      location: geo ? {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        latitude: geo.ll[0],
        longitude: geo.ll[1]
      } : null,
      device: {
        type: req.useragent.platform,
        browser: req.useragent.browser,
        os: req.useragent.os,
        isMobile: req.useragent.isMobile,
        isTablet: req.useragent.isTablet,
        isDesktop: req.useragent.isDesktop
      },
      referrer: req.headers.referer || ''
    });
    
    await scanLog.save();
    
    // Redirect to the target URL
    res.redirect(qrCode.url);
  } catch (error) {
    console.error('QR Code redirection error:', error);
    res.status(500).send('Server error');
  }
});

// Analytics routes
app.get('/api/analytics/:qrCodeId', authenticate, async (req, res) => {
  try {
    const { qrCodeId } = req.params;
    
    // Verify ownership
    const qrCode = await QRCode.findOne({
      _id: qrCodeId,
      user: req.user.id
    });
    
    if (!qrCode) {
      return res.status(404).json({ message: 'QR Code not found' });
    }
    
    // Get all scan logs
    const scanLogs = await ScanLog.find({ qrCode: qrCodeId });
    
    // Calculate summary data
    const totalScans = scanLogs.length;
    
    // Daily scans
    const dailyScans = {};
    scanLogs.forEach(log => {
      const date = log.timestamp.toISOString().split('T')[0];
      dailyScans[date] = (dailyScans[date] || 0) + 1;
    });
    
    // Geographical distribution
    const geoDistribution = {};
    scanLogs.forEach(log => {
      if (log.location?.country) {
        const country = log.location.country;
        geoDistribution[country] = (geoDistribution[country] || 0) + 1;
      }
    });
    
    // Device breakdown
    const deviceTypes = {
      mobile: 0,
      tablet: 0,
      desktop: 0
    };
    
    scanLogs.forEach(log => {
      if (log.device.isMobile) deviceTypes.mobile++;
      else if (log.device.isTablet) deviceTypes.tablet++;
      else if (log.device.isDesktop) deviceTypes.desktop++;
    });
    
    // Browser stats
    const browsers = {};
    scanLogs.forEach(log => {
      if (log.device.browser) {
        const browser = log.device.browser;
        browsers[browser] = (browsers[browser] || 0) + 1;
      }
    });
    
    // OS stats
    const operatingSystems = {};
    scanLogs.forEach(log => {
      if (log.device.os) {
        const os = log.device.os;
        operatingSystems[os] = (operatingSystems[os] || 0) + 1;
      }
    });
    
    // Time of day breakdown (hourly)
    const hourlyDistribution = Array(24).fill(0);
    scanLogs.forEach(log => {
      const hour = log.timestamp.getHours();
      hourlyDistribution[hour]++;
    });
    
    res.json({
      qrCode: {
        name: qrCode.name,
        url: qrCode.url,
        createdAt: qrCode.createdAt,
        totalScans
      },
      analytics: {
        dailyScans,
        geoDistribution,
        deviceTypes,
        browsers,
        operatingSystems,
        hourlyDistribution,
        recentScans: scanLogs.slice(0, 20).map(log => ({
          timestamp: log.timestamp,
          location: log.location ? `${log.location.city || ''}, ${log.location.country || 'Unknown'}` : 'Unknown',
          device: log.device.isMobile ? 'Mobile' : log.device.isTablet ? 'Tablet' : 'Desktop',
          browser: log.device.browser || 'Unknown',
          os: log.device.os || 'Unknown'
        }))
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});