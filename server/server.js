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
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'https://7d61-69-145-61-179.ngrok-free.app'],
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
    type: new mongoose.Schema({
      type: String,
      browser: String,
      os: String,
      isMobile: Boolean,
      isTablet: Boolean,
      isDesktop: Boolean
    }, { _id: false }),
    default: {}
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
    console.log('Received registration request:', {
      username: req.body.username,
      email: req.body.email
    });
    
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      console.log('Registration failed: Missing required fields');
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if user already exists
    console.log('Checking for existing user...');
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log('Registration failed: User already exists');
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    console.log('Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    console.log('Creating new user...');
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });
    
    console.log('Saving user to database...');
    const savedUser = await newUser.save();
    console.log('User saved successfully with ID:', savedUser._id);
    
    // Generate JWT
    console.log('Generating JWT token...');
    const token = jwt.sign(
      { userId: savedUser._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Set cookie
    console.log('Setting token cookie...');
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.toString() });
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
    const userId = req.user.id;

    if (!name || !url || !qrImageData) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already has a QR code with this name
    let qrCode = await QRCode.findOne({ user: userId, name });

    if (qrCode) {
      // Overwrite existing
      qrCode.url = url;
      qrCode.qrImageData = qrImageData;
      qrCode.settings = settings;
      await qrCode.save();
    } else {
      // Create new with a unique shortId
      let shortId;
      let isUnique = false;

      while (!isUnique) {
        shortId = generateShortId();
        const existingQR = await QRCode.findOne({ shortId });
        if (!existingQR) isUnique = true;
      }

      qrCode = new QRCode({
        user: userId,
        name,
        url,
        shortId,
        qrImageData,
        settings
      });

      await qrCode.save();
    }

    res.status(200).json({
      message: 'QR Code saved successfully',
      qrCode: {
        id: qrCode._id,
        name: qrCode.name,
        url: qrCode.url,
        shortId: qrCode.shortId,
        createdAt: qrCode.createdAt,
        qrImageData: qrCode.qrImageData,
        trackingUrl: `${req.protocol}://${req.get('host')}/q/${qrCode.shortId}`
      }
    });

  } catch (error) {
    console.error('QR Code creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a test QR code redirect route
app.get('/api/test-redirect', async (req, res) => {
  try {
    console.log('Testing redirect endpoint...');
    
    // Find any QR code in the database
    const testQRCode = await QRCode.findOne();
    
    if (!testQRCode) {
      return res.status(404).json({ message: 'No QR codes found in database' });
    }
    
    console.log('Found QR code with shortId:', testQRCode.shortId);
    console.log('Destination URL:', testQRCode.url);
    
    // Use ngrok URL explicitly
    const ngrokUrl = "https://7d61-69-145-61-179.ngrok-free.app";
    const trackingUrl = `${ngrokUrl}/q/${testQRCode.shortId}`;
    
    res.json({
      success: true,
      message: 'Test redirect URL created',
      shortId: testQRCode.shortId,
      trackingUrl: trackingUrl,
      destinationUrl: testQRCode.url,
      testLink: `<a href="${trackingUrl}" target="_blank">Click to test redirect</a>`
    });
  } catch (error) {
    console.error('Test redirect error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Test redirect failed',
      error: error.message
    });
  }
});

// Add a database test route
app.get('/api/test-database', async (req, res) => {
  try {
    // Create a simple test collection
    const TestCollection = mongoose.model('TestCollection', new mongoose.Schema({
      name: String,
      createdAt: { type: Date, default: Date.now }
    }), 'testcollection');
    
    // Create a document
    const testDoc = new TestCollection({ name: 'test-document' });
    await testDoc.save();
    
    // Retrieve it
    const retrievedDoc = await TestCollection.findById(testDoc._id);
    
    // Delete it to clean up
    await TestCollection.deleteOne({ _id: testDoc._id });
    
    res.json({
      success: true,
      message: 'Database connection and operations working correctly!',
      document: retrievedDoc
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
    });
  }
});

//Test endpoint for mongoDB connection
app.get('/api/test-db', async (req, res) => {
  try {
    // Try to perform a simple MongoDB operation
    const count = await User.countDocuments();
    res.json({ message: 'Database connection successful', count });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Database connection failed', error: error.message });
  }
});

// FOR TESTING ONLY - Remove in production
app.get('/api/test-qrcode', async (req, res) => {
  try {
    // First find a valid user from the database
    const testUser = await User.findOne();
    
    if (!testUser) {
      return res.status(404).json({ message: 'No users found in database. Please create a user first.' });
    }
    
    const shortId = generateShortId();
    const testQRCode = new QRCode({
      user: testUser._id, // Use a real ObjectId from an existing user
      name: "Test QR Code",
      url: "https://example.com",
      shortId,
      qrImageData: "data:image/png;base64,test", // Just a placeholder
      settings: {
        qrColor: "#000000",
        bgColor: "#FFFFFF",
        size: 256,
        includeMargin: true,
        qrStyle: "dots",
        cornerStyle: "square",
        hasLogo: false
      }
    });
    
    await testQRCode.save();
    
    res.json({
      message: 'Test QR Code created successfully',
      shortId,
      trackingUrl: `${req.protocol}://${req.get('host')}/q/${shortId}`
    });
  } catch (error) {
    console.error('Test QR Code creation error:', error);
    res.status(500).json({ message: 'Error creating test QR code', error: error.message });
  }
});

// QR Code redirection and tracking endpoint
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
      location: geo && geo.ll ? {
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

app.get('/api/qrcodes', authenticate, async (req, res) => {
  try {
    const qrCodes = await QRCode.find({ user: req.user.id })
      .select('name url shortId scans createdAt qrImageData') // ✅ Added this
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