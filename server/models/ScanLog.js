const mongoose = require('mongoose');

delete mongoose.connection.models['ScanLog']; // ← this is key

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

module.exports = mongoose.model('ScanLog', scanLogSchema);
