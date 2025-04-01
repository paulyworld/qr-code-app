const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    console.log('Running authentication middleware');
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    console.log('Token received:', token ? 'Token exists' : 'No token');
    
    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Decoded token:', decoded);
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('User not found for ID:', decoded.userId);
      return res.status(401).json({ message: 'User not found' });
    }
    
    console.log('User authenticated:', user._id.toString());
    
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

module.exports = authenticate;