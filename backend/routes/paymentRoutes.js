const express = require('express');
const router = express.Router();
const { processPayment, paymentValidation, getPaymentDetails } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/process', protect, paymentValidation, processPayment);
router.get('/ride/:rideId', protect, getPaymentDetails);

module.exports = router;
