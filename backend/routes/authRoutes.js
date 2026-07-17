const express = require('express');
const router = express.Router();
const {
  register,
  registerValidation,
  login,
  loginValidation,
  getMe,
  toggleOnline,
  updateLocation,
  addSavedCard,
  getSavedCards,
  deleteSavedCard
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/toggle-online', protect, toggleOnline);
router.put('/location', protect, updateLocation);

// Saved cards routes
router.get('/cards', protect, getSavedCards);
router.post('/cards/add', protect, addSavedCard);
router.delete('/cards/:cardId', protect, deleteSavedCard);

module.exports = router;
