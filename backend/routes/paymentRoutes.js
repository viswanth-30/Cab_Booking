const express = require('express');
const router = express.Router();
const { processPayment, getPaymentDetails } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/process', protect, processPayment);
router.get('/ride/:rideId', protect, getPaymentDetails);

module.exports = router;
