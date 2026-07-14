const Ride = require('../models/Ride');
const User = require('../models/User');

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

// Calculate estimate
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

    const duration = Math.round(dist * 2); // 2 mins per km

    const estimates = {
      bike: {
        fare: Math.round(Math.max(30, 30.0 + dist * 10)),
        vehicleType: 'bike',
        name: 'Moto Bike',
        description: 'Fastest solo travel through traffic',
        eta: Math.max(1, Math.round(Math.random() * 3) + 1) // Estimated arrival time in mins
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

// Create a new Ride request and assign seeded driver
const createRide = async (req, res, next) => {
  try {
    const { 
      pickupLocation, 
      dropoffLocation, 
      vehicleType, 
      baseFare, 
      promoApplied, 
      discountAmount, 
      donationAmount 
    } = req.body;

    // Check active rides
    const activeRide = await Ride.findOne({
      user: req.user._id,
      status: { $in: ['requested', 'accepted', 'pickup', 'inprogress'] }
    });

    if (activeRide) {
      return res.status(400).json({ success: false, message: 'You already have an active booking' });
    }

    // Find our default seeded driver
    let matchedDriver = await User.findOne({ email: 'driver@ucab.com' });
    if (!matchedDriver) {
      // Create a fallback driver on the fly if not seeded
      matchedDriver = await User.create({
        name: 'Dave Driver',
        email: 'driver@ucab.com',
        password: 'hashedpassword',
        role: 'driver',
        vehicleType: 'sedan',
        vehicleNumber: 'KA-01-AB-1234',
        isVerified: true,
        isOnline: true
      });
    }

    // Calculate final initial fare: base - discount + donation
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

    // Emit live update over socket
    if (req.io) {
      req.io.to(req.user._id.toString()).emit('rideStatusUpdate', populatedRide);
    }

    res.status(201).json({
      success: true,
      ride: populatedRide
    });
  } catch (error) {
    next(error);
  }
};

// Purchase refreshment during active ride
const buyRefreshment = async (req, res, next) => {
  try {
    const { rideId, item, price, qty } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Active ride not found' });
    }

    // Add refreshment item
    ride.refreshments.push({ item, price, qty: qty || 1 });
    ride.refreshmentsTotal += price * (qty || 1);
    
    // Recalculate final fare
    ride.fare = Math.max(0.5, ride.baseFare - ride.discountAmount + ride.donationAmount + ride.refreshmentsTotal);
    await ride.save();

    const populatedRide = await Ride.findById(ride._id).populate('user').populate('driver');

    // Notify user immediately in real-time
    if (req.io) {
      req.io.to(ride.user.toString()).emit('rideStatusUpdate', populatedRide);
    }

    res.json({
      success: true,
      ride: populatedRide
    });
  } catch (error) {
    next(error);
  }
};

// Get current active ride
const getActiveRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({
      user: req.user._id,
      status: { $in: ['requested', 'accepted', 'pickup', 'inprogress'] }
    }).populate('user').populate('driver');
    
    res.json({
      success: true,
      ride: ride || null
    });
  } catch (error) {
    next(error);
  }
};

// Update Ride Status (For automated simulation controls)
const updateRideStatus = async (req, res, next) => {
  try {
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
    }

    res.json({ success: true, ride: populatedRide });
  } catch (error) {
    next(error);
  }
};

// Get Ride History
const getRideHistory = async (req, res, next) => {
  try {
    const rides = await Ride.find({ user: req.user._id }).populate('user').populate('driver');
    res.json({
      success: true,
      rides
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFareEstimate,
  createRide,
  buyRefreshment,
  getActiveRide,
  updateRideStatus,
  getRideHistory
};
