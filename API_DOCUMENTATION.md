# API Documentation — Ucab Cab Booking System

**Base URL:** `http://localhost:5000/api` (development) or `https://your-app.onrender.com/api` (production)

**Authentication:** Bearer token in `Authorization` header  
**Format:** `Authorization: Bearer <jwt_token>`

---

## Authentication Routes

### POST `/api/auth/register`

Register a new user account.

**Access:** Public

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}
```

For driver registration, include:
```json
{
  "name": "Dave Driver",
  "email": "dave@example.com",
  "password": "password123",
  "role": "driver",
  "vehicleType": "sedan",
  "vehicleNumber": "KA-01-AB-1234",
  "licenseNumber": "DL-1234567890"
}
```

**Response (201):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

### POST `/api/auth/login`

Authenticate user and receive JWT token.

**Access:** Public

**Request Body:**
```json
{
  "email": "rider@ucab.com",
  "password": "rider123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "name": "John Rider",
    "email": "rider@ucab.com",
    "role": "user"
  }
}
```

---

### GET `/api/auth/me`

Get current logged-in user profile.

**Access:** Private (requires JWT)

**Response (200):**
```json
{
  "success": true,
  "user": {
    "_id": "...",
    "name": "John Rider",
    "email": "rider@ucab.com",
    "role": "user",
    "rating": 5.0
  }
}
```

---

### PUT `/api/auth/toggle-online`

Toggle driver online/offline status.

**Access:** Private (Driver only)

**Response (200):**
```json
{
  "success": true,
  "isOnline": true,
  "message": "Driver status set to Online"
}
```

---

### PUT `/api/auth/location`

Update driver GPS location.

**Access:** Private (Driver only)

**Request Body:**
```json
{
  "lat": 12.9716,
  "lng": 77.5946
}
```

---

### GET `/api/auth/cards`

Get user's saved payment cards.

**Access:** Private

---

### POST `/api/auth/cards/add`

Add a payment card.

**Access:** Private

**Request Body:**
```json
{
  "cardBrand": "Visa",
  "last4": "4242",
  "cardholderName": "John Rider"
}
```

---

### DELETE `/api/auth/cards/:cardId`

Delete a saved payment card.

**Access:** Private

---

## Ride Routes

### GET `/api/rides/estimate`

Get fare estimates for a route.

**Access:** Private

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `pickupLat` | Number | Pickup latitude |
| `pickupLng` | Number | Pickup longitude |
| `dropoffLat` | Number | Dropoff latitude |
| `dropoffLng` | Number | Dropoff longitude |

**Response (200):**
```json
{
  "success": true,
  "distance": 5.42,
  "duration": 11,
  "estimates": {
    "bike": { "fare": 84, "vehicleType": "bike", "name": "Moto Bike", "eta": 2 },
    "sedan": { "fare": 151, "vehicleType": "sedan", "name": "Standard Sedan", "eta": 4 },
    "suv": { "fare": 256, "vehicleType": "suv", "name": "Premium SUV", "eta": 5 }
  }
}
```

---

### POST `/api/rides/book`

Book a new ride.

**Access:** Private

**Request Body:**
```json
{
  "pickupLocation": { "name": "MG Road", "lat": 12.9716, "lng": 77.5946 },
  "dropoffLocation": { "name": "Indiranagar", "lat": 12.9784, "lng": 77.6408 },
  "vehicleType": "sedan",
  "baseFare": 151,
  "promoApplied": "WELCOME5",
  "discountAmount": 50,
  "donationAmount": 10
}
```

---

### GET `/api/rides/active`

Get current active ride for the rider.

**Access:** Private

---

### PUT `/api/rides/status`

Update ride status (rider simulation controls).

**Access:** Private

**Request Body:**
```json
{
  "rideId": "...",
  "status": "accepted"
}
```

---

### PUT `/api/rides/cancel/:rideId`

Cancel a ride (only for requested/accepted/pickup status).

**Access:** Private

---

### GET `/api/rides/history`

Get ride history for the logged-in rider.

**Access:** Private

---

### POST `/api/rides/buy-refreshment`

Purchase a refreshment during an active ride.

**Access:** Private

**Request Body:**
```json
{
  "rideId": "...",
  "item": "Cold Mineral Water",
  "price": 20,
  "qty": 1
}
```

---

## Driver Routes

### GET `/api/rides/driver/rides`

Get all rides assigned to the logged-in driver.

**Access:** Private (Driver only)

---

### GET `/api/rides/driver/active`

Get the driver's current active ride.

**Access:** Private (Driver only)

---

### PUT `/api/rides/driver/accept/:rideId`

Accept a ride request.

**Access:** Private (Driver only)

---

### PUT `/api/rides/driver/reject/:rideId`

Reject a ride request.

**Access:** Private (Driver only)

---

### PUT `/api/rides/driver/status`

Update ride status from driver side (with state transition validation).

**Access:** Private (Driver only)

**Request Body:**
```json
{
  "rideId": "...",
  "status": "pickup"
}
```

**Valid Transitions:** `accepted → pickup → inprogress → completed`

---

## Payment Routes

### POST `/api/payments/process`

Process payment for a completed ride.

**Access:** Private

**Request Body:**
```json
{
  "rideId": "...",
  "paymentMethod": "card"
}
```

**Response (201):**
```json
{
  "success": true,
  "payment": {
    "_id": "...",
    "amount": 151,
    "paymentMethod": "card",
    "status": "completed",
    "transactionId": "TXN-A1B2C3D4E5"
  }
}
```

---

### GET `/api/payments/ride/:rideId`

Get payment details for a specific ride.

**Access:** Private

---

## Admin Routes

All admin routes require `admin` role authorization.

### GET `/api/admin/users?search=query`

Get all users (optional search by name/email).

**Access:** Private (Admin only)

---

### GET `/api/admin/drivers`

Get all registered drivers.

**Access:** Private (Admin only)

---

### PUT `/api/admin/drivers/:driverId/verify`

Toggle driver verification status.

**Access:** Private (Admin only)

---

### GET `/api/admin/rides`

Get all rides in the system.

**Access:** Private (Admin only)

---

### GET `/api/admin/stats`

Get aggregate booking statistics.

**Access:** Private (Admin only)

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "totalRides": 25,
    "completedRides": 18,
    "cancelledRides": 3,
    "activeRides": 4,
    "totalUsers": 10,
    "totalDrivers": 5,
    "verifiedDrivers": 3,
    "onlineDrivers": 2,
    "totalRevenue": 3450.50
  }
}
```

---

### GET `/api/admin/payments`

Get all payment records.

**Access:** Private (Admin only)

---

## Socket.io Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `userId` | Join personal notification room |
| `joinRideRoom` | `rideId` | Join ride-specific tracking room |
| `updateLocation` | `{ rideId, userId, lat, lng }` | Send driver GPS location update |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `rideStatusUpdate` | Ride object | Ride status changed |
| `driverLocationUpdate` | `{ lat, lng }` | Driver position updated |
| `newRideRequest` | Ride object | New ride assigned to driver |
| `paymentStatusUpdate` | Payment object | Payment processed |

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |
