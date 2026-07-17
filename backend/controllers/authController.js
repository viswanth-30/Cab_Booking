const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

/**
 * Generate JWT token with configurable expiry
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Validation rules for registration
 */
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'driver']).withMessage('Role must be user or driver')
];

/**
 * Validation rules for login
 */
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, email, password, role, vehicleType, vehicleNumber, licenseNumber } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
      role: role || 'user'
    };

    // Add driver-specific fields
    if (role === 'driver') {
      userData.vehicleType = vehicleType;
      userData.vehicleNumber = vehicleNumber;
      userData.licenseNumber = licenseNumber;
      userData.isVerified = false;
      userData.isOnline = false;
      userData.currentLocation = {
        lat: 12.9716 + (Math.random() - 0.5) * 0.05,
        lng: 77.5946 + (Math.random() - 0.5) * 0.05
      };
    }

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isOnline: user.isOnline,
        vehicleType: user.vehicleType,
        vehicleNumber: user.vehicleNumber
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user and get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isOnline: user.isOnline,
        vehicleType: user.vehicleType,
        vehicleNumber: user.vehicleNumber,
        currentLocation: user.currentLocation
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isOnline: user.isOnline,
        vehicleType: user.vehicleType,
        vehicleNumber: user.vehicleNumber,
        currentLocation: user.currentLocation,
        rating: user.rating
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle driver online/offline status
 * @route   PUT /api/auth/toggle-online
 * @access  Private (Driver only)
 */
const toggleOnline = async (req, res, next) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Only drivers can toggle online status' });
    }

    const driver = await User.findById(req.user._id);
    driver.isOnline = !driver.isOnline;
    await driver.save();

    res.json({
      success: true,
      isOnline: driver.isOnline,
      message: `Driver status set to ${driver.isOnline ? 'Online' : 'Offline'}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update driver's current GPS location
 * @route   PUT /api/auth/location
 * @access  Private (Driver only)
 */
const updateLocation = async (req, res, next) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Only drivers can update location' });
    }

    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const driver = await User.findById(req.user._id);
    driver.currentLocation = { lat, lng };
    await driver.save();

    res.json({
      success: true,
      currentLocation: driver.currentLocation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a saved payment card
 * @route   POST /api/auth/cards/add
 * @access  Private
 */
const addSavedCard = async (req, res, next) => {
  try {
    const { cardBrand, last4, cardholderName } = req.body;

    if (!last4 || !cardholderName) {
      return res.status(400).json({ success: false, message: 'Card details are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.savedCards.push({ cardBrand: cardBrand || 'Visa', last4, cardholderName });
    await user.save();

    res.json({
      success: true,
      savedCards: user.savedCards,
      message: 'Card added successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's saved payment cards
 * @route   GET /api/auth/cards
 * @access  Private
 */
const getSavedCards = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      savedCards: user.savedCards || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a saved payment card
 * @route   DELETE /api/auth/cards/:cardId
 * @access  Private
 */
const deleteSavedCard = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.savedCards = user.savedCards.filter(c => c._id?.toString() !== cardId);
    await user.save();

    res.json({
      success: true,
      savedCards: user.savedCards,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
