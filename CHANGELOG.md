# Changelog

All notable changes to the **Ucab Cab Booking System** project will be documented in this file.

## July 2026 — Critical Bug Fix: Driver Dashboard Not Receiving Ride Requests

**Symptom**: Rider books a ride successfully, but the request never appears on the Driver Dashboard — no error shown anywhere.

**Root Causes Identified & Fixed**:

### 1. React Hooks Misplacement (`frontend/src/pages/DriverDashboard.jsx`)
All three `useEffect` hooks (initial data fetch, Socket.io listeners, polling fallback) were accidentally nested inside the `getStatusActions()` helper function's `switch/case 'accepted':` block. This violates React's Rules of Hooks — the hooks only ran when `getStatusActions()` was called during render AND the active ride status was `'accepted'`. On first load with no active ride, **none of these hooks ever executed**, so the driver dashboard never fetched pending rides and never listened for socket events.

**Fix**: Moved all `useEffect` hooks to the component's top level, before `getStatusActions()` is defined.

### 2. No Proximity-Based Driver Matching (`backend/controllers/rideController.js`)
The `createRide` function used `User.findOne(...)` which returns whichever driver MongoDB picks first — not the nearest one. A driver right next to the rider could be skipped in favor of a distant one.

**Fix**: Now fetches all eligible online drivers via `User.find(...)`, computes haversine distance from the pickup location for each, and assigns the **closest** driver. Falls back to any verified driver if no online drivers have a location set.

### 3. Socket Connection Diagnostics (`frontend/src/context/AuthContext.jsx`)
No visibility into whether the Socket.io connection was actually established. If `VITE_SOCKET_URL` pointed at the wrong address, the socket silently failed.

**Fix**: Added diagnostic `console.log` / `console.error` for:
- The resolved `SOCKET_URL` value
- Successful connection (with socket ID)
- Connection failures (with error message and target URL)

### 4. Backend Socket Event Logging (`backend/server.js` & `backend/controllers/rideController.js`)
No server-side confirmation that socket room joins and ride event emissions were actually firing.

**Fix**: Added `console.log` statements for:
- `[socket] user <id> joined room <id>` — when a user joins their personal socket room
- `[ride] emitted newRideRequest to driver room <id>` — when a ride request is emitted to the matched driver
- `[ride] nearest driver: <name> (<distance> km from pickup)` — when proximity matching selects a driver

### 5. Polling Fallback (`frontend/src/pages/DriverDashboard.jsx`)
Real-time socket push was the **only** way the driver found out about new rides. If the socket dropped or failed to connect, ride requests were invisible until a manual page refresh.

**Fix**: Added a `setInterval`-based polling fallback that calls `fetchDriverRides()` and `fetchDriverActiveRide()` every 8 seconds, guaranteeing ride requests appear within ~8s even if the socket connection is down.

### 6. Frontend Environment Variables (`frontend/.env`)
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

## [2.0.0] - 2026-07-17

This release represents a complete transformation of the codebase to meet the premium quality, security, and feature completeness standards required for the SmartBridge internship project.

### Added
- **Driver Dashboard**: A professional interface for drivers to toggle online/offline status, view verification flags, receive live ride requests, accept/reject bookings, progress through ride stages (Reach Pickup, Start Trip, Complete Trip), and simulate real-time GPS location movements.
- **Admin Dashboard**: A comprehensive admin panel with analytics cards (total users, total drivers, active/completed/cancelled rides, and revenue stats), payment records view, all-rides audit logs, and driver verification controls (Verify/Unverify toggle buttons).
- **Admin Backend Component**: Introduced `adminController.js` and `adminRoutes.js` for secure dashboard data aggregation.
- **Security Enhancements**: 
  - Integrated `helmet` middleware for secure HTTP headers.
  - Implemented `express-rate-limit` to restrict API request abuse (with stricter limits on registration and login endpoints).
  - Added request input validations using `express-validator` on auth controllers and ride endpoints.
  - Added role-based authorization middleware (`authorize`) to protect driver and admin routes.
- **Environment Templates**: Added `.env.example` configurations for both `backend` and `frontend`.
- **Deployment Assets**: Added `render.yaml` for unified Render web services deployment.
- **Documentation Package**: Generated comprehensive `API_DOCUMENTATION.md`, `DEPLOYMENT_GUIDE.md`, `REVIEW_REPORT.md`, and an importable Postman API collection under `postman/Ucab_API_Collection.json`.
- **Directory Structure**: Created a dedicated `screenshots` folder to hold UI flows.

### Changed
- **Dashboard Routing**: Refactored `Dashboard.jsx` from a rider-only default panel into a dynamic role-based routing switcher that directs users to their corresponding dashboard (`UserDashboard`, `DriverDashboard`, or `AdminDashboard`).
- **Database Assignment**: Upgraded ride assignment logic from a hardcoded `driver@ucab.com` user search to dynamically search and assign the nearest available, verified, and online driver.
- **Auth Configuration**: Restricted JWT session tokens to a secure 7-day expiration (previously 30 days) and removed all fallback hardcoded secrets.
- **API URLs**: Replaced all hardcoded `localhost:5000` URLs in the frontend context and dashboards with environment-based `import.meta.env.VITE_API_URL` and `import.meta.env.VITE_SOCKET_URL` variables.

### Removed
- **Dead Code**: Deleted the unused, boilerplate `App.css` file from the frontend assets.
