import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  
  // Driver specific state
  const [vehicleType, setVehicleType] = useState('sedan');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      name,
      email,
      password,
      role
    };

    if (role === 'driver') {
      payload.vehicleType = vehicleType;
      payload.vehicleNumber = vehicleNumber;
      payload.licenseNumber = licenseNumber;
    }

    try {
      await register(payload);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Check details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: '90vh' }}>
      <div className="glass-panel p-5 w-100" style={{ maxWidth: '550px' }}>
        <div className="text-center mb-4">
          <img src="https://img.icons8.com/color/48/taxi.png" alt="Ucab Taxi" className="mb-2" />
          <h2 className="text-white text-glow mb-1">Create Account</h2>
          <p className="text-secondary small">Register to book cabs or accept rides</p>
        </div>

        {error && (
          <div className="alert alert-danger border-0 bg-danger-subtle text-danger px-3 py-2 rounded-3 mb-3 d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label text-secondary small">Full Name</label>
              <input 
                type="text" 
                required
                className="form-control custom-input" 
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="col-md-6 mb-3">
              <label className="form-label text-secondary small">Email Address</label>
              <input 
                type="email" 
                required
                className="form-control custom-input" 
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label text-secondary small">Password</label>
              <input 
                type="password" 
                required
                className="form-control custom-input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label text-secondary small">Account Role</label>
              <select 
                className="form-select custom-input" 
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="user">Rider (Book Rides)</option>
                <option value="driver">Driver (Offer Rides)</option>
              </select>
            </div>
          </div>

          {/* Conditional Driver Details */}
          {role === 'driver' && (
            <div className="p-3 bg-dark rounded-3 border border-secondary mb-4 mt-2">
              <h5 className="text-white text-glow mb-3 small fw-bold">Driver Credentials</h5>
              
              <div className="mb-3">
                <label className="form-label text-secondary small">Vehicle Model Type</label>
                <select 
                  className="form-select custom-input"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                >
                  <option value="sedan">Sedan (4 Seater)</option>
                  <option value="suv">Premium SUV (6 Seater)</option>
                  <option value="bike">Moto Bike (Solo)</option>
                </select>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label text-secondary small">Vehicle Number Plate</label>
                  <input 
                    type="text" 
                    required={role === 'driver'}
                    className="form-control custom-input" 
                    placeholder="KA-03-HA-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                  />
                </div>
                
                <div className="col-md-6 mb-3">
                  <label className="form-label text-secondary small">Driver License Number</label>
                  <input 
                    type="text" 
                    required={role === 'driver'}
                    className="form-control custom-input" 
                    placeholder="DL-9876543210"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                  />
                </div>
              </div>
              <span className="text-warning small d-block mt-1">⚠️ Note: Drivers require admin approval before they can accept bookings. Log in to Admin panel after driver registration to verify documents!</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn glow-btn w-100 py-3 rounded-pill mt-3 mb-2"
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            ) : null}
            Create Account
          </button>
        </form>

        <div className="text-center mt-3 small text-secondary">
          Already have an account? <Link to="/login" className="text-indigo fw-semibold text-decoration-none">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
