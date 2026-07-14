import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark navbar-custom py-3 px-4 sticky-top">
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center gap-2 fs-3" to="/">
          <img src="https://img.icons8.com/color/48/taxi.png" alt="Ucab logo" width="36" height="36" />
          <span className="fw-extrabold text-white" style={{ fontFamily: 'var(--font-heading)' }}>Ucab</span>
        </Link>
        
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link text-white-50" to="/">Home</Link>
            </li>
            {user && (
              <li className="nav-item">
                <Link className="nav-link text-white-50" to="/dashboard">Book Ride</Link>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center gap-3">
            {user ? (
              <>
                <span className="badge bg-dark border border-secondary text-light px-3 py-2 rounded-pill d-flex align-items-center gap-2">
                  <i className="bi bi-person-fill text-info"></i>
                  {user.name}
                </span>

                <button onClick={handleLogout} className="btn btn-outline-danger btn-sm px-3 rounded-pill">
                  <i className="bi bi-box-arrow-right me-1"></i> Logout
                </button>
              </>
            ) : (
              <div className="d-flex gap-2">
                <Link to="/login" className="btn btn-outline-light btn-sm px-4 rounded-pill">Login</Link>
                <Link to="/register" className="btn glow-btn btn-sm px-4 rounded-pill">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
