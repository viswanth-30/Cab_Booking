const User = require('../models/User');
const Ride = require('../models/Ride');
const Payment = require('../models/Payment');

/**
 * @desc    Get all users with optional search
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { name: { $in: [search] } },
          { email: { $in: [search] } }
        ]
      };
    }

    const users = await User.find(query);

    // Sanitize — remove passwords from response
    const sanitizedUsers = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isVerified: u.isVerified,
      isOnline: u.isOnline,
      vehicleType: u.vehicleType,
      vehicleNumber: u.vehicleNumber,
      licenseNumber: u.licenseNumber,
      rating: u.rating,
      createdAt: u.createdAt
    }));

    res.json({ success: true, count: sanitizedUsers.length, users: sanitizedUsers });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all drivers
 * @route   GET /api/admin/drivers
 * @access  Private (Admin)
 */
const getAllDrivers = async (req, res, next) => {
  try {
    const drivers = await User.find({ role: 'driver' });

    const sanitizedDrivers = drivers.map(d => ({
      _id: d._id,
      name: d.name,
      email: d.email,
      role: d.role,
      isVerified: d.isVerified,
      isOnline: d.isOnline,
      vehicleType: d.vehicleType,
      vehicleNumber: d.vehicleNumber,
      licenseNumber: d.licenseNumber,
      rating: d.rating,
      currentLocation: d.currentLocation,
      createdAt: d.createdAt
    }));

    res.json({ success: true, count: sanitizedDrivers.length, drivers: sanitizedDrivers });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify or unverify a driver
 * @route   PUT /api/admin/drivers/:driverId/verify
 * @access  Private (Admin)
 */
const verifyDriver = async (req, res, next) => {
  try {
    const driver = await User.findById(req.params.driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (driver.role !== 'driver') {
      return res.status(400).json({ success: false, message: 'User is not a driver' });
    }

    driver.isVerified = !driver.isVerified;
    await driver.save();

    res.json({
      success: true,
      message: `Driver ${driver.isVerified ? 'verified' : 'unverified'} successfully`,
      driver: {
        _id: driver._id,
        name: driver.name,
        email: driver.email,
        isVerified: driver.isVerified,
        vehicleType: driver.vehicleType,
        vehicleNumber: driver.vehicleNumber,
        licenseNumber: driver.licenseNumber
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all rides
 * @route   GET /api/admin/rides
 * @access  Private (Admin)
 */
const getAllRides = async (req, res, next) => {
  try {
    const rides = await Ride.find({}).populate('user').populate('driver');
    res.json({ success: true, count: rides.length, rides });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get booking statistics
 * @route   GET /api/admin/stats
 * @access  Private (Admin)
 */
const getBookingStats = async (req, res, next) => {
  try {
    const totalRides = await Ride.countDocuments({});
    const completedRides = await Ride.countDocuments({ status: 'completed' });
    const cancelledRides = await Ride.countDocuments({ status: 'cancelled' });
    const activeRides = await Ride.countDocuments({
      status: { $in: ['requested', 'accepted', 'pickup', 'inprogress'] }
    });
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalDrivers = await User.countDocuments({ role: 'driver' });
    const verifiedDrivers = await User.countDocuments({ role: 'driver', isVerified: true });
    const onlineDrivers = await User.countDocuments({ role: 'driver', isOnline: true });

    // Calculate total revenue from completed rides
    const completedRidesList = await Ride.find({ status: 'completed' });
    const totalRevenue = completedRidesList.reduce((sum, ride) => sum + (ride.fare || 0), 0);

    res.json({
      success: true,
      stats: {
        totalRides,
        completedRides,
        cancelledRides,
        activeRides,
        totalUsers,
        totalDrivers,
        verifiedDrivers,
        onlineDrivers,
        totalRevenue: Math.round(totalRevenue * 100) / 100
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all payments
 * @route   GET /api/admin/payments
 * @access  Private (Admin)
 */
const getAllPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({}).populate('ride');
    res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getAllDrivers,
  verifyDriver,
  getAllRides,
  getBookingStats,
  getAllPayments
};
