const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Ride = require('../models/Ride');

const paymentValidation = [
  body('rideId').trim().notEmpty().withMessage('Ride ID is required'),
  body('paymentMethod').optional().isIn(['card', 'wallet', 'cash']).withMessage('Invalid payment method')
];

const processPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { rideId, paymentMethod } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (ride.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Payment can only be processed for completed rides' });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ ride: rideId });
    if (existingPayment && existingPayment.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Payment already processed' });
    }

    const transactionId = 'TXN-' + Math.random().toString(36).substring(2, 12).toUpperCase();

    let payment;
    if (existingPayment) {
      existingPayment.status = 'completed';
      existingPayment.paymentMethod = paymentMethod;
      existingPayment.transactionId = transactionId;
      payment = await existingPayment.save();
    } else {
      payment = await Payment.create({
        ride: rideId,
        amount: ride.fare,
        paymentMethod: paymentMethod || 'card',
        status: 'completed',
        transactionId
      });
    }

    const populatedPayment = await Payment.findById(payment._id).populate({
      path: 'ride',
      populate: { path: 'driver user' }
    });

    if (req.io) {
      req.io.to(ride.user.toString()).emit('paymentStatusUpdate', populatedPayment);
      if (ride.driver) {
        req.io.to(ride.driver.toString()).emit('paymentStatusUpdate', populatedPayment);
      }
    }

    res.status(201).json({
      success: true,
      payment: populatedPayment
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentDetails = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ ride: req.params.rideId }).populate({
      path: 'ride',
      populate: { path: 'driver user' }
    });

    res.json({
      success: true,
      payment: payment || null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processPayment,
  paymentValidation,
  getPaymentDetails
};
