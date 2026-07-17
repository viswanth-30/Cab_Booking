# SmartBridge Internship Technical Evaluation Review Report

This report summarizes the technical review of the **Ucab Cab Booking System** project, acting as a Senior Technical Reviewer. 

---

## 🔍 Problems Found & Resolved

The initial audit and subsequent reviews revealed several architectural, functional, security, and React-specific issues that would have failed the internship qualification. Below is the list of problems found and the exact fixes applied:

### 1. Architectural & Routing Issues
- **Problem**: No separate views existed for different user roles. All logged-in accounts (riders, drivers, admins) were mapped to the rider dashboard (`UserDashboard`).
- **Fix**: Re-engineered `Dashboard.jsx` to act as a dynamic role-based router rendering:
  - `UserDashboard` for riders (`role: 'user'`).
  - `DriverDashboard` for drivers (`role: 'driver'`).
  - `AdminDashboard` for platform administrators (`role: 'admin'`).
- **Problem**: Unused, dangling boilerplate files (`App.css`) from the original Vite scaffold were present in the asset tree.
- **Fix**: Deleted `App.css` to keep the build light and warning-free.

### 2. Driver & Simulation Coordination
- **Problem**: When a driver was online, the rider's client-side automation timers would still trigger auto-accept and auto-simulation actions, clashing with manual driver controls.
- **Fix**: Configured check routines in the rider's simulation `useEffect` hooks to yield state control. If `activeRide.driver.isOnline` is true, the rider dashboard pauses its timers and listens for live status updates via WebSockets.
- **Problem**: Ride matching in `createRide` assigned the first online driver, regardless of the vehicle class requested (e.g. assigning a sedan driver for a motorcycle request).
- **Fix**: Refactored the database query to match requested `vehicleType` filters first, online status second, and fall back to general verified drivers third.

### 3. Security & Validation Gaps
- **Problem**: The backend had a hardcoded JWT fallback secret in code, making it vulnerable to signature forgery.
- **Fix**: Removed the hardcoded secret. Signatures are now strictly verified using `process.env.JWT_SECRET`.
- **Problem**: Incoming payloads on core endpoints lacked schema validations, allowing malformed payload variables.
- **Fix**: Integrated `express-validator` to build schema checks on authentication (`/register`, `/login`), booking requests, refreshments purchases, and payments.
- **Problem**: The API was vulnerable to brute-force and request flooding.
- **Fix**: Configured `helmet` headers and `express-rate-limit` restrictions, with extra-strict caps on authentication endpoints.
- **Problem**: The ride cancellation action updated status values without verifying the current state, potentially cancelling active trips.
- **Fix**: Replaced the inline status update on the front-end with a secure `/api/rides/cancel/:rideId` route which verifies that the ride is only in `requested`, `accepted`, or `pickup` state before canceling.

### 4. React Compilation & Hook Dependencies
- **Problem**: Functions defined inside React components were used as `useEffect` hook dependencies without stable references, triggering React Hook warning logs.
- **Fix**: Wrapped all fetching and calculation methods in `useCallback` blocks with stable dependency variables.
- **Problem**: The authorization headers object in the Admin dashboard was created inline, generating new references on every render.
- **Fix**: Memoized the headers block inside a `useMemo` hook based on changes to the session token.

---

## ⚠️ Remaining Limitations

1. **Simulated Payment Capture**: The payment endpoint generates mock transaction IDs and updates payment statuses without connecting to real bank card APIs (Razorpay/Stripe).
2. **Straight-line Distance Calculations**: Travel metrics (fares, distance, duration) use straight-line Haversine math rather than street-by-street routing engines.
3. **Geo-Search Target Limits**: Nominatim lookup results are restricted to India addresses to optimize performance for the Bangalore-themed demo.
