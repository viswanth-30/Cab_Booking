const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'driver', 'admin'], default: 'user' },
  
  // Saved Payment Methods
  savedCards: [{
    cardBrand: { type: String, default: 'Visa' },
    last4: { type: String, default: '4242' },
    cardholderName: { type: String, default: 'John Rider' }
  }],

  // Keep these for simulated driver match references
  vehicleType: { type: String, enum: ['sedan', 'suv', 'bike'] },
  vehicleNumber: { type: String },
  licenseNumber: { type: String },
  isVerified: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  currentLocation: {
    lat: { type: Number, default: 12.9716 },
    lng: { type: Number, default: 77.5946 }
  },
  rating: { type: Number, default: 5.0 },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = getModel('User', UserSchema);
