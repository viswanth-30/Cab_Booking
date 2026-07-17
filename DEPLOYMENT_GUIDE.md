# Deployment Guide — Ucab Cab Booking System

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (free tier works)
- [Render](https://render.com/) account (for backend)
- [Vercel](https://vercel.com/) account (for frontend — optional)

---

## Option 1: Deploy as Monolith on Render (Recommended)

This approach serves both the API and the React frontend from a single Render service.

### Step 1: Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free cluster
2. Create a database user with read/write access
3. Whitelist all IPs (`0.0.0.0/0`) for Render access
4. Copy the connection string: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ucab`

### Step 2: Deploy to Render

1. Push your code to a GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click **New** → **Web Service**
4. Connect your GitHub repository
5. Configure the service:
   - **Name**: `ucab-backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm install --prefix frontend && npm run build --prefix frontend`
   - **Start Command**: `node backend/server.js`
6. Add environment variables:
   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | `mongodb+srv://...` (your Atlas URI) |
   | `JWT_SECRET` | Generate a random 32+ character string |
   | `JWT_EXPIRE` | `7d` |
   | `PORT` | `10000` (Render default) |
7. Click **Create Web Service**

The app will be live at `https://ucab-backend.onrender.com`

### Step 3: Verify Deployment

- Visit `https://your-app.onrender.com` — you should see the Ucab landing page
- Test login with seeded credentials:
  - Rider: `rider@ucab.com` / `rider123`
  - Driver: `driver@ucab.com` / `driver123`
  - Admin: `admin@ucab.com` / `admin123`

---

## Option 2: Split Deployment (Render + Vercel)

### Backend on Render

Follow Steps 1-2 from Option 1, but use:
- **Build Command**: `npm install`
- **Start Command**: `node backend/server.js`

### Frontend on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **New Project** → Import your GitHub repo
3. Set the **Root Directory** to `frontend`
4. Set **Framework Preset** to `Vite`
5. Add environment variables:
   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | `https://your-render-app.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://your-render-app.onrender.com` |
6. Deploy

---

## Local Development Setup

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env if needed (defaults work for local development)
npm install
npm run dev
```

The backend runs on `http://localhost:5000` and frontend on `http://localhost:5173`.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `NODE_ENV` | Environment mode | No (default: development) |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `JWT_EXPIRE` | Token expiration time | No (default: 7d) |

### Frontend (`frontend/.env`)

| Variable | Description | Required |
|----------|------------|----------|
| `VITE_API_URL` | Backend API base URL | No (default: /api) |
| `VITE_SOCKET_URL` | Backend Socket.io URL | No (default: window.location.origin) |

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| MongoDB connection fails | Check your `MONGO_URI`, ensure IP whitelisting is set to `0.0.0.0/0` |
| JWT errors after deploy | Ensure `JWT_SECRET` is set in environment variables |
| Frontend shows blank page | Check browser console for errors, verify `VITE_API_URL` |
| Socket.io not connecting | Ensure `VITE_SOCKET_URL` points to the backend URL |
| Build fails on Render | Check Node.js version compatibility (v18+) |
