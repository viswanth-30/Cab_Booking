const { body, validationResult } = require('express-validator');
const Ride = require('../models/Ride');
const User = require('../models/User');

const createRideValidation = [
  body('pickupLocation.name').trim().notEmpty().withMessage('Pickup location name is required'),
  body('pickupLocation.lat').isFloat().withMessage('Pickup latitude must be a valid coordinate number'),
  body('pickupLocation.lng').isFloat().withMessage('Pickup longitude must be a valid coordinate number'),
  body('dropoffLocation.name').trim().notEmpty().withMessage('Dropoff location name is required'),
  body('dropoffLocation.lat').isFloat().withMessage('Dropoff latitude must be a valid coordinate number'),
  body('dropoffLocation.lng').isFloat().withMessage('Dropoff longitude must be a valid coordinate number'),
  body('vehicleType').isIn(['sedan', 'suv', 'bike']).withMessage('Invalid vehicle type'),
  body('baseFare').isFloat({ min: 0 }).withMessage('Base fare must be a positive number')
];

const buyRefreshmentValidation = [
  body('rideId').trim().notEmpty().withMessage('Ride ID is required'),
  body('item').trim().notEmpty().withMessage('Item name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('qty').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
];

const updateRideStatusValidation = [
  body('rideId').trim().notEmpty().withMessage('Ride ID is required'),
  body('status').isIn(['requested', 'accepted', 'pickup', 'inprogress', 'completed', 'cancelled']).withMessage('Invalid status')
];

const updateDriverRideStatusValidation = [
  body('rideId').trim().notEmpty().withMessage('Ride ID is required'),
  body('status').isIn(['pickup', 'inprogress', 'completed']).withMessage('Invalid status transition')
];

/**
 * Calculate distance between two coordinates using Haversine formula
 */
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * @desc    Get fare estimates for pickup/dropoff
 * @route   GET /api/rides/estimate
 * @access  Private
 */
const getFareEstimate = async (req, res, next) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng } = req.query;

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({ success: false, message: 'Pickup and dropoff coordinates are required' });
    }

    const dist = getDistance(
      parseFloat(pickupLat),
      parseFloat(pickupLng),
      parseFloat(dropoffLat),
      parseFloat(dropoffLng)
    );

    const duration = Math.round(dist * 2); // ~2 mins per km

    const estimates = {
      bike: {
        fare: Math.round(Math.max(30, 30.0 + dist * 10)),
        vehicleType: 'bike',
        name: 'Moto Bike',
        description: 'Fastest solo travel through traffic',
        eta: Math.max(1, Math.round(Math.random() * 3) + 1)
      },
      sedan: {
        fare: Math.round(Math.max(70, 70.0 + dist * 15)),
        vehicleType: 'sedan',
        name: 'Standard Sedan',
        description: 'Comfortable everyday sedans',
        eta: Math.max(1, Math.round(Math.random() * 4) + 2)
      },
      suv: {
        fare: Math.round(Math.max(120, 120.0 + dist * 25)),
        vehicleType: 'suv',
        name: 'Premium SUV',
        description: 'Spacious 6-seater premium rides',
        eta: Math.max(1, Math.round(Math.random() * 5) + 3)
      }
    };

    res.json({
      success: true,
      distance: parseFloat(dist.toFixed(2)),
      duration,
      estimates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new ride booking and assign nearest driver
 * @route   POST /api/rides/book
 * @access  Private (Rider)
 */
const createRide = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const {
      pickupLocation,
      dropoffLocation,
      vehicleType,
      baseFare,
      promoApplied,
      discountAmount,
      donationAmount
    } = req.body;

    // Check for existing active ride
    const activeRide = await Ride.findOne({
      user: req.user._id,
      status: { $in: ['requested', 'accepted', 'pickup', 'inprogress'] }
    });

    if (activeRide) {
      return res.status(400).json({ success: false, message: 'You already have an active booking' });
    }

    // Find nearest available verified online driver matching vehicleType
    let matchedDriver = await User.findOne({
      role: 'driver',
      isVerified: true,
      isOnline: true,
      vehicleType: vehicleType
    });

    // Fallback: find any verified driver of the requested vehicleType
    if (!matchedDriver) {
      matchedDriver = await User.findOne({
        role: 'driver',
        isVerified: true,
        vehicleType: vehicleType
      });
    }

    if (!matchedDriver) {
      return res.status(404).json({ success: false, message: 'No available drivers found. Please try again later.' });
    }

    // Calculate final fare
    const finalFare = Math.max(0.5, baseFare - (discountAmount || 0) + (donationAmount || 0));

    const ride = await Ride.create({
      user: req.user._id,
      driver: matchedDriver._id,
      pickupLocation,
      dropoffLocation,
      baseFare,
      fare: finalFare,
      status: 'requested',
      promoApplied: promoApplied || '',
      discountAmount: discountAmount || 0,
      donationAmount: donationAmount || 0,
      refreshments: [],
      refreshmentsTotal: 0
    });

    const populatedRide = await Ride.findById(ride._id).populate('user').populate('driver');

    // Emit live updates via socket
    if (req.io) {
      req.io.to(req.user._id.toString()).emit('rideStatusUpdate', populatedRide);
      req.io.to(matchedDriver._id.toString()).emit('newRideRequest', populatedRide);
    }

    res.status(201).json({
      success: true,
      ride: populatedRide
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add refreshment during active ride
 * @route   POST /api/rides/buy-refreshment
 * @access  Private
 */
const buyRefreshment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { rideId, item, price, qty } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Active ride not found' });
    }

    ride.refreshments.push({ item, price, qty: qty || 1 });
    ride.refreshmentsTotal += price * (qty || 1);
    ride.fare = Math.max(0.5, ride.baseFare - ride.discountAmount + ride.donationAmount + ride.refreshmentsTotal);
    await ride.save();

    const populatedRide = await Ride.findById(ride._id).populate('user').populate('driver');

    if (req.io) {
      req.io.to(ride.user.toString()).emit('rideStatusUpdate', populatedRide);
    }

    res.json({ success: true, ride: populatedRide });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current active ride for logged-in rider
 * @route   GET /api/rides/active
 * @access  Private
 */
const getActiveRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({
      user: req.user._id,
      status: { $in: ['requested', 'accepted', 'pickup', 'inprogress'] }
    }).populate('user').populate('driver');

    res.json({ success: true, ride: ride || null });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update ride status (used by rider for simulation controls)
 * @route   PUT /api/rides/status
 * @access  Private
 */
const updateRideStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { rideId, status } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    ride.status = status;
    if (status === 'completed') {
      ride.completedAt = new Date();
    }
    await ride.save();

    const populatedRide = await Ride.findById(ride._id).populate('user').populate('driver');

    if (req.io) {
      req.io.to(ride.user.toString()).emit('rideStatusUpdate', populatedRide);
      if (ride.driver) {
        req.io.to(ride.driver.toString()).emit('rideStatusUpdate', populatedRide);
      }
    }

    res.json({ success: true, ride: populatedRide });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a ride
 * @route   PUT /api/rides/cancel/:rideId
 * @access  Private
 */
const cancelRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // Only allow cancellation of pending/accepted rides
    if (!['requested', 'accepted', 'pickup'].includes(ride.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel a ride that is already in progress or completed' });
    }

    ride.status = 'cancelled';
    await ride.save();

    const populatedRide = await Ride.findById(ride._id).populate('user').populate('driver');

    if (req.io) {
      req.io.to(ride.user.toString()).emit('rideStatusUpdate', populatedRide);
      if (ride.driver) {
        req.io.to(ride.driver.toString()).emit('rideStatusUpdate', populatedRide);
      }
    }

    res.json({ success: true, ride: populatedRide, message: 'Ride cancelled successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get ride history for logged-in rider
 * @route   GET /api/rides/history
 * @access  Private
 */
const getRideHistory = async (req, res, next) => {
  try {
    const rides = await Ride.find({ user: req.user._id }).populate('user').populate('driver');
    res.json({ success: true, rides });
  } catch (error) {
    next(error);
  }
};

// =============================================
// DRIVER-SPECIFIC ENDPOINTS
// =============================================

/**
 * @desc    Get rides assigned to the logged-in driver
 * @route   GET /api/rides/driver/rides
 * @access  Private (Driver)
 */
const getDriverRides = async (req, res, next) => {
  try {
    const rides = await Ride.find({ driver: req.user._id }).populate('user').populate('driver');
    res.json({ success: true, rides });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active ride for the driver
 * @route   GET /api/rides/driver/active
 * @access  Private (Driver)
 */
const getDriverActiveRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({
      driver: req.user._id,
      status: { $in: ['requested', 'accepted', 'pickup', 'inprogress'] }
    }).populate('user').populate('driver');

    res.json({ success: true, ride: ride || null });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept a ride request
 * @route   PUT /api/rides/driver/accept/:rideId
 * @access  Private (Driver)
 */
const acceptRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'This ride is not assigned to you' });
    }

    if (ride.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Ride cannot be accepted in its current state' });
    }

    ride.status = 'accepted';
    await ride.save();

    const populatedRide = await Ride.findById(ride._id).populate('user').populate('driver');

    if (req.io) {
      req.io.to(ride.user.toString()).emit('rideStatusUpdate', populatedRide);
      req.io.to(ride.driver.toString()).emit('rideStatusUpdate', populatedRide);
    }

    res.json({ success: true, ride: populatedRide, message: 'Ride accepted' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a ride request
 * @route   PUT /api/rides/driver/reject/:rideId
 * @access  Private (Driver)
 */
const rejectRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'This ride is not assigned to you' });
    }

    if (ride.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Ride cannot be rejected in its current state' });
    }

    ride.status = 'cancelled';
    await ride.save();

    const populatedRide = await Ride.findById(ride._id).populate('user').populate('driver');

    if (req.io) {
      req.io.to(ride.user.toString()).emit('rideStatusUpdate', populatedRide);
    }

    res.json({ success: true, ride: populatedRide, message: 'Ride rejected' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update ride status from driver side (pickup -> inprogress -> completed)
 * @route   PUT /api/rides/driver/status
 * @access  Private (Driver)
 */
const updateDriverRideStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { rideId, status } = req.body;

    const validTransitions = {
      'accepted': ['pickup'],
      'pickup': ['inprogress'],
      'inprogress': ['completed']
    };

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'This ride is not assigned to you' });
    }

    const allowed = validTransitions[ride.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${ride.status}' to '${status}'`
      });
    }

    ride.status = status;
    if (status === 'completed') {
      ride.completedAt = new Date();
    }
    await ride.save();

    const populatedRide = await Ride.findById(ride._id).populate('user').populate('driver');

    if (req.io) {
      req.io.to(ride.user.toString()).emit('rideStatusUpdate', populatedRide);
      req.io.to(ride.driver.toString()).emit('rideStatusUpdate', populatedRide);
    }

    res.json({ success: true, ride: populatedRide });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFareEstimate,
  createRide,
  createRideValidation,
  buyRefreshment,
  buyRefreshmentValidation,
  getActiveRide,
  updateRideStatus,
  updateRideStatusValidation,
  cancelRide,
  getRideHistory,
  getDriverRides,
  getDriverActiveRide,
  acceptRide,
  rejectRide,
  updateDriverRideStatus,
  updateDriverRideStatusValidation
};
