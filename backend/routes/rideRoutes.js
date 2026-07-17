const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/rideController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Rider routes
router.get('/estimate', protect, getFareEstimate);
router.post('/book', protect, createRideValidation, createRide);
router.post('/buy-refreshment', protect, buyRefreshmentValidation, buyRefreshment);
router.get('/active', protect, getActiveRide);
router.put('/status', protect, updateRideStatusValidation, updateRideStatus);
router.put('/cancel/:rideId', protect, cancelRide);
router.get('/history', protect, getRideHistory);

// Driver-specific routes
router.get('/driver/rides', protect, authorize('driver'), getDriverRides);
router.get('/driver/active', protect, authorize('driver'), getDriverActiveRide);
router.put('/driver/accept/:rideId', protect, authorize('driver'), acceptRide);
router.put('/driver/reject/:rideId', protect, authorize('driver'), rejectRide);
router.put('/driver/status', protect, authorize('driver'), updateDriverRideStatusValidation, updateDriverRideStatus);

module.exports = router;
