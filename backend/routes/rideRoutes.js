const express = require('express');
const router = express.Router();
const {
  getFareEstimate,
  createRide,
  buyRefreshment,
  getActiveRide,
  updateRideStatus,
  getRideHistory
} = require('../controllers/rideController');
const { protect } = require('../middleware/authMiddleware');

router.get('/estimate', protect, getFareEstimate);
router.post('/book', protect, createRide);
router.post('/buy-refreshment', protect, buyRefreshment);
router.get('/active', protect, getActiveRide);
router.put('/status', protect, updateRideStatus);
router.get('/history', protect, getRideHistory);

module.exports = router;
