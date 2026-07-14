const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const User = require('./models/User');

// Load env vars
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // For demo compatibility
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Share socket io instance with routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/payments', paymentRoutes);

// Base route
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Ucab API is running...');
  });
}

// Error handling
app.use(errorHandler);

// Socket.io configuration
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join a room unique to the user/driver ID
  socket.on('join', (userId) => {
    socket.join(userId.toString());
    console.log(`User joined personal room: ${userId}`);
  });

  // Handle active ride room join
  socket.on('joinRideRoom', (rideId) => {
    socket.join(rideId.toString());
    console.log(`Joined ride room: ${rideId}`);
  });

  // Handle real-time driver location updates
  socket.on('updateLocation', async ({ rideId, userId, lat, lng }) => {
    try {
      const driver = await User.findById(userId);
      if (driver && driver.role === 'driver') {
        driver.currentLocation = { lat, lng };
        await driver.save();
        
        // Broadcast location updates to the specific ride room
        if (rideId) {
          io.to(rideId.toString()).emit('driverLocationUpdate', { lat, lng });
        }
      }
    } catch (err) {
      console.error('Socket location update error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Seed default Admin, Rider, and Driver
const seedData = async () => {
  try {
    const bcrypt = require('bcryptjs');

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
      console.log('✅ Default Rider seeded: rider@ucab.com / rider123 (with cards)');
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
        currentLocation: {
          lat: 12.9716,
          lng: 77.5946
        }
      });
      console.log('✅ Default Driver seeded: driver@ucab.com / driver123');
    }
  } catch (err) {
    console.error('Error seeding database:', err.message);
  }
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to database (failsafe fallback inside)
  await connectDB();
  
  // Seed admin, rider, driver
  await seedData();

  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

// Trigger database re-seed
startServer();
