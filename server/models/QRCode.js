const mongoose = require('mongoose');

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

module.exports = mongoose.model('QRCode', qrCodeSchema);