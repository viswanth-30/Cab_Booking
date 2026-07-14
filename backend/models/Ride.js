const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const RideSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pickupLocation: {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  dropoffLocation: {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  
  // Fare details
  baseFare: { type: Number, default: 0 },
  fare: { type: Number, required: true }, // Current active fare (incorporates discounts/donations/refreshments)
  distance: { type: Number },
  duration: { type: Number },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'pickup', 'inprogress', 'completed', 'cancelled'],
    default: 'requested'
  },
  
  // Extra features
  promoApplied: { type: String, default: '' },
  discountAmount: { type: Number, default: 0 },
  donationAmount: { type: Number, default: 0 },
  
  refreshments: [{
    item: { type: String },
    price: { type: Number },
    qty: { type: Number, default: 1 }
  }],
  refreshmentsTotal: { type: Number, default: 0 },

  rating: { type: Number },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = getModel('Ride', RideSchema);
