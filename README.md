# Ucab 🚖 Next-Gen MERN Stack Cab Booking System

Ucab is a simple, reliable, and premium cab hailing application that makes travel stress-free. Built using the **MERN Stack** (MongoDB, Express.js, React, and Node.js), Ucab allows riders to book rides, track their drivers in real-time, settle fares automatically using saved cards, and even buy refreshments during the journey.

For example, when **Sarah** needed to reach the airport urgently, she used Ucab to book a nearby cab, tracked the driver's approach, and arrived exactly on time.

---

## 🏗️ Project Architecture

```mermaid
graph TD
    subgraph Frontend (React.js + Vite)
        A[Rider Dashboard] -->|Axios / Socket.io| B(Auth Context)
        C[Leaflet Dark Map]
        A -->|Select Destination| C
    end
    subgraph Backend (Express.js + Node)
        D[Server.js] -->|Socket.io| E[Real-Time GPS Channel]
        D -->|REST API| F[Controllers]
    end
    subgraph Database Layer
        G[db.js Proxy] -->|If Connected| H[(MongoDB Atlas)]
        G -->|If Offline| I[(mock_db.json Engine)]
    end
    B -->|API Requests| D
```

---

## ✨ Core Features

* **Quick Hailing**: Drop pins directly on the dark-themed interactive map (Leaflet.js) or select predefined spots to establish routes.
* **Auto-Matching & GPS Tracking**: Booking a cab automatically assigns a nearby driver (`Dave Driver`). The app starts a live WebSocket (Socket.io) simulation showing the cab navigating roads in real-time.
* **Promotions & Discounts**: Apply codes like **`WELCOME5`** (flat $5.00 off) or **`UCAB20`** (20% off base fare) to dynamically reduce costs.
* **Charity Donations**: Opt-in to add a **$1, $2, or $5** donation to the *Green Earth Foundation* to make your travel eco-friendly.
* **In-Ride Refreshment Bar**: Purchase snacks and drinks while the ride is `inprogress`. The live passenger fare updates on screen immediately:
  - 💧 Cold Mineral Water ($1.00)
  - 🥤 Organic Fizzy Soda ($1.50)
  - 🍪 Crunchy Energy Snack ($2.00)
* **Automatic Saved Cards Payments**: Save cards (Visa / Mastercard) under your profile. The final fare is charged automatically upon arrival.
* **Seeded Credentials**: Demo accounts are pre-seeded in the database for instant testing.
* **Failsafe Database Fallback**: A custom database Proxy layer automatically shifts Mongoose queries to a local JSON document database (`backend/mock_db.json`) if MongoDB is unavailable.

---

## 🔑 Pre-seeded Test Accounts

Use these pre-saved logins to log in instantly (using the dashboard's quick-login buttons):

| User Type | Email | Password | Pre-loaded Details |
| :--- | :--- | :--- | :--- |
| **Rider (User)** | `rider@ucab.com` | `rider123` | Pre-saved Visa 4242 & Mastercard 8888 cards. |
| **Driver** | `driver@ucab.com` | `driver123` | Dave Driver (Sedan, KA-01-AB-1234). |
| **Admin** | `admin@ucab.com` | `admin123` | Platform Administrator. |

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Step 1: Run the Backend API
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the Express server:
   ```bash
   npm run dev
   ```
   *(Running on port `5000`)*

### Step 2: Run the Frontend App
1. Navigate to the `frontend` folder:
   ```bash
   cd ../frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   *(Running on port `5173`)*

---

## 📁 Repository Structure

```text
cabooking/
├── backend/
│   ├── config/db.js          # Dual-mode database fallback compiler (with JS Proxy)
│   ├── controllers/          # Business logic handlers (Auth, Rides, Payments)
│   ├── middleware/           # Auth JWT validations and error managers
│   ├── models/               # Schemas (User, Ride, Payment)
│   ├── routes/               # Express endpoints router maps
│   ├── mock_db.json          # File database fallback database (auto-seeded)
│   ├── server.js             # Main server startup and socket connection managers
│   └── .env                  # Configuration keys
├── frontend/
│   ├── src/
│   │   ├── components/       # Custom Navbar & Leaflet MapContainer
│   │   ├── context/          # React AuthContext, Axios client & Sockets
│   │   ├── pages/            # View dashboards (Home, Login, Register, UserDashboard)
│   │   ├── App.jsx           # Private route switcher
│   │   ├── index.css         # Styling system (glassmorphism & glowing highlights)
│   │   └── main.jsx          # DOM mounting
│   ├── index.html            # Core document loaders
│   └── vite.config.js        # Bundler configs
└── .gitignore                # Root git ignore configurations
```
