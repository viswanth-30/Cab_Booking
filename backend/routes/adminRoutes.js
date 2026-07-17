const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getAllDrivers,
  verifyDriver,
  getAllRides,
  getBookingStats,
  getAllPayments
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes require authentication + admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/users', getAllUsers);
router.get('/drivers', getAllDrivers);
router.put('/drivers/:driverId/verify', verifyDriver);
router.get('/rides', getAllRides);
router.get('/stats', getBookingStats);
router.get('/payments', getAllPayments);

module.exports = router;
