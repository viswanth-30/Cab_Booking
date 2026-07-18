# Ucab 🚖 Next-Gen MERN Stack Cab Booking System

Ucab is a premium, secure, and reliable cab booking application built on the **MERN Stack** (MongoDB, Express.js, React, Node.js). Designed for a seamless ride-hailing experience, Ucab features interactive mapping (Leaflet.js), real-time updates via Socket.io, role-based dashboards, secure payments, and a modern dark glassmorphism user interface.

---

## 🏗️ Project Architecture

```mermaid
graph TD
    subgraph Frontend [React.js + Vite + Leaflet]
        A[Dashboard Switcher] -->|Rider Role| B[Rider Dashboard]
        A -->|Driver Role| C[Driver Dashboard]
        A -->|Admin Role| D[Admin Dashboard]
    end
    
    subgraph Backend [Node.js + Express.js + Socket.io]
        E[Server.js] -->|Middleware| F[Auth & Security Guard]
        F -->|Controllers| G[User, Ride, Payment, Admin]
        E -->|WebSockets| H[Real-Time Location Channel]
      end

    subgraph Database [Database Layer]
        I[Mongoose db.js Proxy] -->|Atlas Mode| J[(MongoDB Atlas)]
        I -->|Fallback Mode| K[(Local JSON mock_db.json)]
    end

    B & C & D -->|HTTP API Requests| E
    B & C -->|Socket Events| E
    G -->|Data Access| I
```

---

## ✨ Features

### 👤 Rider Portal
- **Interactive Routing**: Tap and drop pins on a customized Leaflet dark map to select pickup and dropoff points, or search addresses in India.
- **Fare Estimate & Comparison**: View real-time estimated fare across multiple vehicle classes (Moto Bike, Standard Sedan, Premium SUV) with dynamic ETAs.
- **Eco-Donations**: Add optional contributions (₹10, ₹20, ₹50) to the Green Earth Foundation.
- **Promo System**: Save up to ₹50 or get 20% off by applying promotional discount codes (e.g. `WELCOME5`, `UCAB20`).
- **In-Ride Refreshment Bar**: Purchase drinks (water, soda) or snacks directly from the dashboard while your ride is in progress. The fare updates instantly.
- **Saved Cards Checkout**: Add and delete cards securely to experience automatic fare deduction upon ride completion.

### 🚘 Driver Portal
- **Online/Offline Switcher**: Control availability status at any time.
- **Ride Request Queue**: Receive incoming requests in real-time, with detailed routes, fares, and options to accept or reject them.
- **Active Trip Manager**: Step-by-step progress tracking: Accept → Reached Pickup → Start Trip → Complete Trip.
- **GPS Simulation & Sharing**: Update and broadcast real-time location via Socket.io. If GPS is unavailable, use the clearly labelled **"Simulate Driver Movement"** button to mock progress for demo purposes.
- **Verification Status**: Displays a verification alert if the admin has not yet approved the driver's license.

### 🛡️ Admin Dashboard
- **Aggregate Analytics**: Instant statistics for total rides, completed bookings, cancellations, online drivers, registered users, and system earnings.
- **User Directory**: Search and audit all riders and administrators in the system.
- **Driver Verification Desk**: Review driver registrations, vehicles, licenses, and toggle verification approval statuses instantly.
- **Rides Audit Ledger**: Comprehensive view of all requested, cancelled, and active rides.
- **Payment Ledger**: Real-time auditing of completed transaction IDs, amounts, and settlement methods.

### 🔒 Security Implementations
- **HTTP Security Headers**: Powered by `helmet` to protect the API from header exploits.
- **API Rate Limiting**: Built-in request limiting per IP on core routes, with stricter rules on authorization routes (`/login`, `/register`).
- **Data Sanitization**: Prevents injection attacks and enforces strict schema fields.
- **Input Validation**: Uses `express-validator` to scrub and check payload formats before controller execution.
- **Session Tokens**: Clean JWT authentication expiring in 7 days, with zero hardcoded secret fallbacks.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Leaflet Map, CSS3 (Glassmorphism design system), Bootstrap 5, Socket.io-client, Axios.
- **Backend**: Node.js, Express.js, Socket.io, Mongoose (MongoDB).
- **Security**: Helmet, Express Rate Limit, Express Validator, Bcryptjs, Jsonwebtoken.

---

## 📂 Folder Structure

```text
cabooking/
├── backend/
│   ├── config/db.js          # Dual-mode database fallback compiler
│   ├── controllers/          # Business logic handlers (Auth, Rides, Payments, Admin)
│   ├── middleware/           # Auth JWT validations, role checkers, error managers
│   ├── models/               # Schemas (User, Ride, Payment)
│   ├── routes/               # Express endpoints router maps
│   ├── mock_db.json          # File database fallback database (auto-seeded)
│   ├── server.js             # Main server startup & socket connection managers
│   ├── .env.example          # Backend configuration keys template
│   └── package.json          # Backend project dependencies
├── frontend/
│   ├── public/               # Public assets
│   ├── src/
│   │   ├── components/       # Custom Navbar & Leaflet MapContainer
│   │   ├── context/          # React AuthContext, Axios client & Sockets
│   │   ├── pages/            # View dashboards (Home, Login, Register, Dashboards)
│   │   ├── App.jsx           # App routes and dashboard router
│   │   ├── index.css         # Styling system (glassmorphism & glowing highlights)
│   │   └── main.jsx          # DOM mounting
│   ├── index.html            # Main document loader
│   ├── .env.example          # Frontend configuration keys template
│   ├── vite.config.js        # Vite bundler configuration
│   └── package.json          # Frontend project dependencies
├── postman/
│   └── Ucab_API_Collection.json # Importable Postman collection
├── screenshots/              # Folder containing screenshots demonstrating UI flows
├── DEPLOYMENT_GUIDE.md       # Step-by-step instructions for hosting
├── API_DOCUMENTATION.md      # Detailed API endpoint references
├── REVIEW_REPORT.md          # Internal SmartBridge scorecard evaluation
├── CHANGELOG.md              # Versions history tracking
├── render.yaml               # Infrastructure configuration for Render
└── README.md                 # Primary system manual
```

---

## 🚀 Installation & Local Setup

### 1. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` file from the template:
   ```bash
   copy .env.example .env
   ```
4. Configure your database URI and JWT secret inside `.env`.
5. Start the backend server:
   ```bash
   npm run dev
   ```
   *The backend will run on `http://localhost:5000`*

### 2. Frontend Setup
1. Open another terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` file from the template:
   ```bash
   copy .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *The frontend will run on `http://localhost:5173`*

---

## 🔑 Demo & Test Accounts

You can log in instantly using the pre-seeded credentials available on the login screen:

| Role | Email | Password | Pre-loaded Details |
| :--- | :--- | :--- | :--- |
| **Rider (User)** | `rider@ucab.com` | `rider123` | Pre-saved Visa 4242 & Mastercard 8888 cards |
| **Driver** | `driver@ucab.com` | `driver123` | Verified status, sedan vehicle assigned |
| **Admin** | `admin@ucab.com` | `admin123` | Platform Administrator access |

---

## 💻 Screenshots Section

The screenshots showing the interactive Rider Panel, dynamic Driver Dashboard with simulation controls, and the statistical Admin Dashboard are located in the [screenshots](file:///c:/Users/LENOVO/OneDrive/Desktop/cabooking/screenshots) directory.

---

## 📡 Core API Endpoints

A quick overview of key endpoints. See [API_DOCUMENTATION.md](file:///c:/Users/LENOVO/OneDrive/Desktop/cabooking/API_DOCUMENTATION.md) for full descriptions.

- **Authentication**:
  - `POST /api/auth/register` - Create account (User or Driver)
  - `POST /api/auth/login` - Retrieve JWT session token
  - `GET /api/auth/me` - Retrieve authenticated session profile
- **Rider Rides**:
  - `GET /api/rides/estimate` - Calculate distance, duration, and fare estimates
  - `POST /api/rides/book` - Request a cab and assign a driver
  - `POST /api/rides/buy-refreshment` - Purchase refreshments during a ride
- **Driver Rides**:
  - `GET /api/rides/driver/rides` - Get assigned requests
  - `PUT /api/rides/driver/accept/:rideId` - Driver accepts booking request
  - `PUT /api/rides/driver/status` - Advance trip stages (pickup, inprogress, completed)
- **Admin**:
  - `GET /api/admin/stats` - Fetch aggregate metrics
  - `PUT /api/admin/drivers/:driverId/verify` - Toggle driver verified status

---

## ☁️ Deployment

For deployment details, check [DEPLOYMENT_GUIDE.md](file:///c:/Users/LENOVO/OneDrive/Desktop/cabooking/DEPLOYMENT_GUIDE.md).
- **Backend API & WebSockets**: Hosted on Render
- **Frontend Assets**: Hosted on Render or Vercel

---

## 🔧 Recent Changes (July 2026)

### 🐛 Critical Bug Fix — Driver Dashboard Not Receiving Ride Requests

**Symptom**: Rider books a ride successfully, but the request never appears on the Driver Dashboard — no error shown anywhere.

**Root Causes Identified & Fixed**:

#### 1. React Hooks Misplacement (`frontend/src/pages/DriverDashboard.jsx`)
All three `useEffect` hooks (initial data fetch, Socket.io listeners, polling fallback) were accidentally nested inside the `getStatusActions()` helper function's `switch/case 'accepted':` block. This violates React's Rules of Hooks — the hooks only ran when `getStatusActions()` was called during render AND the active ride status was `'accepted'`. On first load with no active ride, **none of these hooks ever executed**, so the driver dashboard never fetched pending rides and never listened for socket events.

**Fix**: Moved all `useEffect` hooks to the component's top level, before `getStatusActions()` is defined.

#### 2. No Proximity-Based Driver Matching (`backend/controllers/rideController.js`)
The `createRide` function used `User.findOne(...)` which returns whichever driver MongoDB picks first — not the nearest one. A driver right next to the rider could be skipped in favor of a distant one.

**Fix**: Now fetches all eligible online drivers via `User.find(...)`, computes haversine distance from the pickup location for each, and assigns the **closest** driver. Falls back to any verified driver if no online drivers have a location set.

#### 3. Socket Connection Diagnostics (`frontend/src/context/AuthContext.jsx`)
No visibility into whether the Socket.io connection was actually established. If `VITE_SOCKET_URL` pointed at the wrong address, the socket silently failed.

**Fix**: Added diagnostic `console.log` / `console.error` for:
- The resolved `SOCKET_URL` value
- Successful connection (with socket ID)
- Connection failures (with error message and target URL)

#### 4. Backend Socket Event Logging (`backend/server.js` & `backend/controllers/rideController.js`)
No server-side confirmation that socket room joins and ride event emissions were actually firing.

**Fix**: Added `console.log` statements for:
- `[socket] user <id> joined room <id>` — when a user joins their personal socket room
- `[ride] emitted newRideRequest to driver room <id>` — when a ride request is emitted to the matched driver
- `[ride] nearest driver: <name> (<distance> km from pickup)` — when proximity matching selects a driver

#### 5. Polling Fallback (`frontend/src/pages/DriverDashboard.jsx`)
Real-time socket push was the **only** way the driver found out about new rides. If the socket dropped or failed to connect, ride requests were invisible until a manual page refresh.

**Fix**: Added a `setInterval`-based polling fallback that calls `fetchDriverRides()` and `fetchDriverActiveRide()` every 8 seconds, guaranteeing ride requests appear within ~8s even if the socket connection is down.

#### 6. Frontend Environment Variables (`frontend/.env`)
Verified that both required variables are present:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```
If `VITE_SOCKET_URL` is missing, the socket falls back to `window.location.origin` (the Vite dev server on port 5173), which is **not** the backend — causing silent connection failure.

### Files Modified
| File | Change Summary |
| :--- | :--- |
| `frontend/src/pages/DriverDashboard.jsx` | Moved `useEffect` hooks to component top level; added 8s polling fallback |
| `frontend/src/context/AuthContext.jsx` | Added socket connection diagnostic logging |
| `backend/controllers/rideController.js` | Proximity-based nearest driver matching using haversine distance; emit logging |
| `backend/server.js` | Added socket room join logging |

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
