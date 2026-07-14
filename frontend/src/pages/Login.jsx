import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to login. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (role) => {
    if (role === 'admin') {
      setEmail('admin@ucab.com');
      setPassword('admin123');
    } else if (role === 'driver') {
      setEmail('driver@ucab.com');
      setPassword('driver123');
    } else if (role === 'user') {
      setEmail('rider@ucab.com');
      setPassword('rider123');
    }
  };

  return (
    <div className="container py-5 d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel p-5 w-100" style={{ maxWidth: '500px' }}>
        <div className="text-center mb-4">
          <img src="https://img.icons8.com/color/48/taxi.png" alt="Ucab Taxi" className="mb-2" />
          <h2 className="text-white text-glow mb-1">Welcome Back</h2>
          <p className="text-secondary small">Enter credentials to access Ucab portal</p>
        </div>

        {error && (
          <div className="alert alert-danger border-0 bg-danger-subtle text-danger px-3 py-2 rounded-3 mb-3 d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-secondary small">Email Address</label>
            <input 
              type="email" 
              required
              className="form-control custom-input" 
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-4">
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

          <button 
            type="submit" 
            disabled={loading}
            className="btn glow-btn w-100 py-3 rounded-pill mb-3"
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            ) : null}
            Sign In
          </button>
        </form>

        {/* Demo Auto-fill Helper */}
        <div className="p-3 bg-dark rounded-3 border border-secondary mb-4">
          <div className="small text-secondary mb-2 text-center">🎯 Demo Quick login accounts (Auto-seeded)</div>
          <div className="d-grid gap-2">
            <div className="d-flex justify-content-between gap-2">
              <button 
                type="button" 
                onClick={() => fillCredentials('user')} 
                className="btn btn-outline-info btn-sm flex-fill rounded-pill"
              >
                Rider Account
              </button>
              <button 
                type="button" 
                onClick={() => fillCredentials('driver')} 
                className="btn btn-outline-warning btn-sm flex-fill rounded-pill"
              >
                Driver Account
              </button>
            </div>
            <button 
              type="button" 
              onClick={() => fillCredentials('admin')} 
              className="btn btn-outline-danger btn-sm w-100 rounded-pill"
            >
              System Admin
            </button>
          </div>
        </div>

        <div className="text-center mt-3 small text-secondary">
          Don't have an account? <Link to="/register" className="text-indigo fw-semibold text-decoration-none">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
