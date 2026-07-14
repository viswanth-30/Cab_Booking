import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="container py-5">
      {/* Hero Section */}
      <div className="row align-items-center justify-content-between py-5 my-3">
        <div className="col-lg-6 mb-5 mb-lg-0">
          <div className="badge bg-indigo-subtle border border-indigo text-indigo px-3 py-2 rounded-pill mb-3" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', borderColor: '#4f46e5' }}>
            ✨ Next-Gen Cab Hailing System
          </div>
          <h1 className="display-3 fw-extrabold text-white mb-4 text-glow" style={{ lineHeight: 1.15 }}>
            Rides at your <span style={{ color: 'var(--accent-primary)' }}>finger tips</span>.
          </h1>
          <p className="lead text-secondary mb-4 fs-5" style={{ maxWidth: '500px' }}>
            Book premium rides, track your driver's GPS location in real-time, and experience hassle-free secure payments. Ready to start?
          </p>
          
          <div className="d-flex gap-3">
            {user ? (
              <Link to="/dashboard" className="btn glow-btn btn-lg px-5 py-3 fs-6 rounded-pill">
                Go to Dashboard <i className="bi bi-arrow-right-short ms-1"></i>
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn glow-btn btn-lg px-5 py-3 fs-6 rounded-pill">
                  Get Started <i className="bi bi-arrow-right-short ms-1"></i>
                </Link>
                <Link to="/login" className="btn btn-outline-light btn-lg px-5 py-3 fs-6 rounded-pill">
                  Login Portal
                </Link>
              </>
            )}
          </div>
        </div>
        
        <div className="col-lg-5 text-center">
          <div className="position-relative">
            {/* Ambient glows behind mockup */}
            <div className="position-absolute top-50 start-50 translate-middle rounded-circle bg-indigo blur-3" style={{ width: '300px', height: '300px', background: 'rgba(99, 102, 241, 0.15)', filter: 'blur(80px)', zIndex: 0 }}></div>
            
            <div className="glass-panel p-4 position-relative z-1 d-inline-block text-start" style={{ maxWidth: '400px' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="fw-bold text-glow">🚖 Ucab Simulator</span>
                <span className="badge bg-success text-white pulsing-glow">Active</span>
              </div>
              <div className="bg-dark rounded-3 p-3 border border-secondary mb-3 text-center">
                <i className="bi bi-geo-alt-fill text-danger fs-1"></i>
                <div className="mt-2 text-white fw-semibold">Pickup: MG Road Metro</div>
                <i className="bi bi-arrow-down-short text-secondary fs-4 d-block"></i>
                <i className="bi bi-flag-fill text-success fs-3"></i>
                <div className="text-white fw-semibold">Drop: Indiranagar Stage 2</div>
              </div>
              <div className="d-flex justify-content-between text-secondary mb-2 small">
                <span>Distance: 5.4 km</span>
                <span>Est. Time: 12 mins</span>
              </div>
              <hr className="border-secondary" />
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-secondary small">Sedan Fare</div>
                  <div className="fs-4 fw-bold text-white">$13.10</div>
                </div>
                <div className="btn btn-sm btn-success px-4 rounded-pill">Booked!</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="row text-center mt-5 pt-5">
        <h2 className="text-white mb-5 display-5 text-glow">Engineered for Seamless Travel</h2>
        
        <div className="col-md-4 mb-4">
          <div className="glass-card p-4 h-100 d-flex flex-column align-items-center justify-content-center text-center">
            <div className="bg-indigo-subtle p-3 rounded-circle mb-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', background: 'rgba(99,102,241,0.1)' }}>
              <i className="bi bi-geo-alt-fill text-glow fs-3" style={{ color: 'var(--accent-primary)' }}></i>
            </div>
            <h4 className="text-white mb-3">Real-time Map Tracking</h4>
            <p className="text-secondary mb-0">Watch your driver approach on our custom dark-themed interactive map with animated movement tracking.</p>
          </div>
        </div>

        <div className="col-md-4 mb-4">
          <div className="glass-card p-4 h-100 d-flex flex-column align-items-center justify-content-center text-center">
            <div className="bg-success-subtle p-3 rounded-circle mb-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', background: 'rgba(16,185,129,0.1)' }}>
              <i className="bi bi-shield-lock-fill text-success fs-3 text-glow-success"></i>
            </div>
            <h4 className="text-white mb-3">Role-Based Security</h4>
            <p className="text-secondary mb-0">Restrict routes and ensure privacy with secure JWT authentication and encrypted password hashing.</p>
          </div>
        </div>

        <div className="col-md-4 mb-4">
          <div className="glass-card p-4 h-100 d-flex flex-column align-items-center justify-content-center text-center">
            <div className="bg-warning-subtle p-3 rounded-circle mb-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', background: 'rgba(245,158,11,0.1)' }}>
              <i className="bi bi-credit-card-fill text-warning fs-3"></i>
            </div>
            <h4 className="text-white mb-3">Secure Transactions</h4>
            <p className="text-secondary mb-0">Simulate credit card, wallet, or cash transactions and receive immediate visual receipts.</p>
          </div>
        </div>
      </div>
      
      {/* Simulation/Quick Stats */}
      <div className="glass-panel p-5 mt-5 text-center position-relative">
        <div className="row">
          <div className="col-md-3 mb-4 mb-md-0">
            <h2 className="display-4 fw-extrabold text-glow">99.8%</h2>
            <div className="text-secondary">Matching Rate</div>
          </div>
          <div className="col-md-3 mb-4 mb-md-0">
            <h2 className="display-4 fw-extrabold text-glow">2 mins</h2>
            <div className="text-secondary">Average Match Time</div>
          </div>
          <div className="col-md-3 mb-4 mb-md-0">
            <h2 className="display-4 fw-extrabold text-glow">&lt; 10m</h2>
            <div className="text-secondary">Setup and Go</div>
          </div>
          <div className="col-md-3">
            <h2 className="display-4 fw-extrabold text-glow">100%</h2>
            <div className="text-secondary">Secure Payments</div>
          </div>
        </div>
      </div>
    </div>
  );
}
