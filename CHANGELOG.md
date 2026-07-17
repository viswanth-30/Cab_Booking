# Changelog

All notable changes to the **Ucab Cab Booking System** project will be documented in this file.

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
