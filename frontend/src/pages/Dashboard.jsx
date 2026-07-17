import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserDashboard from './UserDashboard';
import DriverDashboard from './DriverDashboard';
import AdminDashboard from './AdminDashboard';

/**
 * Dashboard router — directs users to role-specific dashboards
 */
export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container py-5 text-center text-secondary">
        <div className="spinner-border text-indigo mb-3" role="status"></div>
        <h5>Verifying session credentials...</h5>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route to role-specific dashboard
  switch (user.role) {
    case 'driver':
      return <DriverDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <UserDashboard />;
  }
}
