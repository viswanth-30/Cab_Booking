const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  toggleOnline, 
  updateLocation,
  addSavedCard,
  getSavedCards,
  deleteSavedCard
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/toggle-online', protect, toggleOnline);
router.put('/location', protect, updateLocation);

// Saved Cards routes
router.get('/cards', protect, getSavedCards);
router.post('/cards/add', protect, addSavedCard);
router.delete('/cards/:cardId', protect, deleteSavedCard);

module.exports = router;
