const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const PaymentSchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  amount: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['card', 'wallet', 'cash'],
    default: 'card'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  transactionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = getModel('Payment', PaymentSchema);
