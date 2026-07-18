const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { connectDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const User = require('./models/User');

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy for rate limiting (Render uses load balancers / reverse proxies)
app.set('trust proxy', 1);

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.CLIENT_URL || true
      : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// =============================================
// SECURITY MIDDLEWARE
// =============================================

// HTTP security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for CDN resources (Bootstrap, Leaflet)
  crossOriginEmbedderPolicy: false
}));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' }
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later' }
});

// =============================================
// CORE MIDDLEWARE
// =============================================

app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Share Socket.io instance with route handlers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// =============================================
// ROUTES
// =============================================

const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Apply rate limiters
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', apiLimiter, rideRoutes);
app.use('/api/payments', apiLimiter, paymentRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

// =============================================
// STATIC FILE SERVING (Production)
// =============================================

const distPath = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*all', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Ucab API is running',
      version: '2.0.0',
      endpoints: {
        auth: '/api/auth',
        rides: '/api/rides',
        payments: '/api/payments',
        admin: '/api/admin'
      }
    });
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// =============================================
// SOCKET.IO CONFIGURATION
// =============================================

io.on('connection', (socket) => {
  // Join personal room for user-specific notifications
  socket.on('join', (userId) => {
    console.log(`[socket] user ${userId} joined room ${userId}`);
    socket.join(userId.toString());
  });

  // Join ride-specific room for ride tracking
  socket.on('joinRideRoom', (rideId) => {
    socket.join(rideId.toString());
  });

  // Handle real-time driver location updates
  socket.on('updateLocation', async ({ rideId, userId, lat, lng }) => {
    try {
      const driver = await User.findById(userId);
      if (driver && driver.role === 'driver') {
        driver.currentLocation = { lat, lng };
        await driver.save();

        if (rideId) {
          io.to(rideId.toString()).emit('driverLocationUpdate', { lat, lng });
        }
      }
    } catch (err) {
      // Silent fail for socket events — don't crash the server
    }
  });

  socket.on('disconnect', () => {
    // Socket cleanup handled automatically
  });
});

// =============================================
// DATABASE SEEDING
// =============================================

const seedData = async () => {
  try {
    // Seed Admin
    const adminEmail = 'admin@ucab.com';
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await User.create({
        name: 'Ucab Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      console.log('✅ Default Admin seeded: admin@ucab.com / admin123');
    }

    // Seed Rider
    const riderEmail = 'rider@ucab.com';
    const riderExists = await User.findOne({ email: riderEmail });
    if (!riderExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('rider123', salt);
      await User.create({
        name: 'John Rider',
        email: riderEmail,
        password: hashedPassword,
        role: 'user',
        savedCards: [
          { cardBrand: 'Visa', last4: '4242', cardholderName: 'John Rider' },
          { cardBrand: 'Mastercard', last4: '8888', cardholderName: 'John Rider' }
        ]
      });
      console.log('✅ Default Rider seeded: rider@ucab.com / rider123');
    }

    // Seed Driver
    const driverEmail = 'driver@ucab.com';
    const driverExists = await User.findOne({ email: driverEmail });
    if (!driverExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('driver123', salt);
      await User.create({
        name: 'Dave Driver',
        email: driverEmail,
        password: hashedPassword,
        role: 'driver',
        vehicleType: 'sedan',
        vehicleNumber: 'KA-01-AB-1234',
        licenseNumber: 'DL-1234567890',
        isVerified: true,
        isOnline: true,
        currentLocation: { lat: 12.9716, lng: 77.5946 }
      });
      console.log('✅ Default Driver seeded: driver@ucab.com / driver123');
    }
  } catch (err) {
    console.error('Error seeding database:', err.message);
  }
};

// =============================================
// SERVER STARTUP
// =============================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedData();

  server.listen(PORT, () => {
    console.log(`🚀 Ucab server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();
