const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkeyforucabapp12345', {
    expiresIn: '30d'
  });
};

const register = async (req, res, next) => {
  try {
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

    if (role === 'driver') {
      userData.vehicleType = vehicleType;
      userData.vehicleNumber = vehicleNumber;
      userData.licenseNumber = licenseNumber;
      userData.isVerified = false; // Admin needs to verify
      userData.isOnline = false;
      // Spawn near Bangalore city center
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

const login = async (req, res, next) => {
  try {
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

const updateLocation = async (req, res, next) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Only drivers can update location' });
    }

    const { lat, lng } = req.body;
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

const addSavedCard = async (req, res, next) => {
  try {
    const { cardBrand, last4, cardholderName } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.savedCards.push({ cardBrand, last4, cardholderName });
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
  login,
  getMe,
  toggleOnline,
  updateLocation,
  addSavedCard,
  getSavedCards,
  deleteSavedCard
};
