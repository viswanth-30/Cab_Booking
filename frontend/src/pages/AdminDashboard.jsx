import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function AdminDashboard() {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [rides, setRides] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/stats`, { headers });
      if (res.data.success) setStats(res.data.stats);
    } catch (err) {
      // Stats may fail if no data yet
    }
  }, [headers]);

  const fetchUsers = useCallback(async (search = '') => {
    try {
      const url = search ? `${API_URL}/admin/users?search=${encodeURIComponent(search)}` : `${API_URL}/admin/users`;
      const res = await axios.get(url, { headers });
      if (res.data.success) setUsers(res.data.users);
    } catch (err) {
      // Handle gracefully
    }
  }, [headers]);

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/drivers`, { headers });
      if (res.data.success) setDrivers(res.data.drivers);
    } catch (err) {
      // Handle gracefully
    }
  }, [headers]);

  const fetchRides = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/rides`, { headers });
      if (res.data.success) setRides(res.data.rides);
    } catch (err) {
      // Handle gracefully
    }
  }, [headers]);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/payments`, { headers });
      if (res.data.success) setPayments(res.data.payments);
    } catch (err) {
      // Handle gracefully
    }
  }, [headers]);

  const handleVerifyDriver = async (driverId) => {
    setLoading(true);
    try {
      await axios.put(`${API_URL}/admin/drivers/${driverId}/verify`, {}, { headers });
      fetchDrivers();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update driver verification');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(searchQuery);
  };

  const statusColors = {
    requested: 'bg-warning-subtle text-warning border-warning',
    accepted: 'bg-info-subtle text-info border-info',
    pickup: 'bg-primary-subtle text-primary border-primary',
    inprogress: 'bg-success-subtle text-success border-success',
    completed: 'bg-success-subtle text-success border-success',
    cancelled: 'bg-danger-subtle text-danger border-danger'
  };

  const roleColors = {
    user: 'bg-info-subtle text-info border-info',
    driver: 'bg-warning-subtle text-warning border-warning',
    admin: 'bg-danger-subtle text-danger border-danger'
  };

  
  // Moved useEffects to avoid TDZ (Temporal Dead Zone) Reference Errors
  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchDrivers();
    fetchRides();
    fetchPayments();
  }, [fetchStats, fetchUsers, fetchDrivers, fetchRides, fetchPayments]);

  

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-glow text-white mb-1">Admin Dashboard</h2>
          <p className="text-secondary small mb-0">Manage users, drivers, rides, and payments</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="btn-group border border-secondary rounded-pill p-1 bg-dark mb-4 flex-wrap">
        {['stats', 'users', 'drivers', 'rides', 'payments'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`btn btn-sm px-4 rounded-pill border-0 ${activeTab === tab ? 'glow-btn' : 'text-secondary'}`}>
            {tab === 'stats' ? '📊 Statistics' :
             tab === 'users' ? '👥 Users' :
             tab === 'drivers' ? '🚗 Drivers' :
             tab === 'rides' ? '🛣️ Rides' : '💳 Payments'}
          </button>
        ))}
      </div>

      {/* Statistics */}
      {activeTab === 'stats' && stats && (
        <div>
          <div className="row g-3 mb-4">
            {[
              { label: 'Total Rides', value: stats.totalRides, icon: '🛣️', color: '#6366f1' },
              { label: 'Completed', value: stats.completedRides, icon: '✅', color: '#10b981' },
              { label: 'Cancelled', value: stats.cancelledRides, icon: '❌', color: '#ef4444' },
              { label: 'Active Now', value: stats.activeRides, icon: '🔄', color: '#f59e0b' },
              { label: 'Total Riders', value: stats.totalUsers, icon: '👤', color: '#8b5cf6' },
              { label: 'Total Drivers', value: stats.totalDrivers, icon: '🚗', color: '#06b6d4' },
              { label: 'Verified Drivers', value: stats.verifiedDrivers, icon: '✅', color: '#10b981' },
              { label: 'Online Drivers', value: stats.onlineDrivers, icon: '🟢', color: '#22c55e' },
            ].map((stat, idx) => (
              <div key={idx} className="col-md-3 col-6">
                <div className="glass-card p-3 text-center h-100">
                  <div className="fs-3 mb-1">{stat.icon}</div>
                  <div className="fs-3 fw-bold text-white" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-secondary small">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue Card */}
          <div className="glass-panel p-4 text-center">
            <div className="text-secondary small mb-1">Total Revenue (Completed Rides)</div>
            <div className="display-4 fw-bold text-glow text-white">₹{stats.totalRevenue}</div>
          </div>
        </div>
      )}

      {/* Users Table */}
      {activeTab === 'users' && (
        <div className="glass-panel p-4">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h4 className="text-white text-glow mb-0">All Users ({users.length})</h4>
            <form onSubmit={handleSearch} className="d-flex gap-2">
              <input
                type="text"
                className="form-control custom-input"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ maxWidth: '250px' }}
              />
              <button type="submit" className="btn btn-outline-light rounded-pill px-3">Search</button>
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(''); fetchUsers(); }}
                  className="btn btn-outline-secondary rounded-pill px-3">Clear</button>
              )}
            </form>
          </div>

          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle border border-secondary mb-0">
              <thead>
                <tr className="border-secondary text-secondary">
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="border-secondary">
                    <td className="text-white">{u.name}</td>
                    <td className="small">{u.email}</td>
                    <td>
                      <span className={`badge rounded-pill px-2 py-1 border ${roleColors[u.role]}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {u.role === 'driver' ? (
                        <span className={`small ${u.isVerified ? 'text-success' : 'text-danger'}`}>
                          {u.isVerified ? '✅ Verified' : '❌ Unverified'}
                        </span>
                      ) : (
                        <span className="text-secondary small">—</span>
                      )}
                    </td>
                    <td className="small">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drivers Table */}
      {activeTab === 'drivers' && (
        <div className="glass-panel p-4">
          <h4 className="text-white text-glow mb-3">Driver Management ({drivers.length})</h4>
          {drivers.length === 0 ? (
            <div className="text-center text-secondary py-5">
              <i className="bi bi-car-front fs-1 mb-2 d-block"></i>
              No drivers registered yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle border border-secondary mb-0">
                <thead>
                  <tr className="border-secondary text-secondary">
                    <th>Name</th>
                    <th>Email</th>
                    <th>Vehicle</th>
                    <th>Plate No.</th>
                    <th>License</th>
                    <th>Online</th>
                    <th>Verified</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(d => (
                    <tr key={d._id} className="border-secondary">
                      <td className="text-white">{d.name}</td>
                      <td className="small">{d.email}</td>
                      <td><span className="badge bg-dark border border-secondary">{d.vehicleType?.toUpperCase() || 'N/A'}</span></td>
                      <td className="small">{d.vehicleNumber || 'N/A'}</td>
                      <td className="small">{d.licenseNumber || 'N/A'}</td>
                      <td>{d.isOnline ? <span className="text-success">🟢 Online</span> : <span className="text-secondary">🔴 Offline</span>}</td>
                      <td>{d.isVerified ? <span className="text-success">✅ Yes</span> : <span className="text-danger">❌ No</span>}</td>
                      <td>
                        <button
                          onClick={() => handleVerifyDriver(d._id)}
                          disabled={loading}
                          className={`btn btn-sm rounded-pill px-3 ${d.isVerified ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        >
                          {d.isVerified ? 'Unverify' : 'Verify'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Rides Table */}
      {activeTab === 'rides' && (
        <div className="glass-panel p-4">
          <h4 className="text-white text-glow mb-3">All Rides ({rides.length})</h4>
          {rides.length === 0 ? (
            <div className="text-center text-secondary py-5">No rides recorded yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle border border-secondary mb-0">
                <thead>
                  <tr className="border-secondary text-secondary">
                    <th>Date</th>
                    <th>Rider</th>
                    <th>Driver</th>
                    <th>Route</th>
                    <th>Fare</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.slice().reverse().map(ride => (
                    <tr key={ride._id} className="border-secondary">
                      <td className="small">{new Date(ride.createdAt).toLocaleDateString()}</td>
                      <td className="small">{ride.user?.name || 'N/A'}</td>
                      <td className="small">{ride.driver?.name || 'Unassigned'}</td>
                      <td className="small">
                        <div className="text-truncate" style={{ maxWidth: '180px' }}>
                          {ride.pickupLocation?.name} → {ride.dropoffLocation?.name}
                        </div>
                      </td>
                      <td className="fw-bold text-white">₹{ride.fare}</td>
                      <td>
                        <span className={`badge rounded-pill px-2 py-1 border ${statusColors[ride.status]}`}>
                          {ride.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payments Table */}
      {activeTab === 'payments' && (
        <div className="glass-panel p-4">
          <h4 className="text-white text-glow mb-3">Payment History ({payments.length})</h4>
          {payments.length === 0 ? (
            <div className="text-center text-secondary py-5">No payments recorded yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle border border-secondary mb-0">
                <thead>
                  <tr className="border-secondary text-secondary">
                    <th>Date</th>
                    <th>Transaction ID</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice().reverse().map(p => (
                    <tr key={p._id} className="border-secondary">
                      <td className="small">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="small font-monospace">{p.transactionId}</td>
                      <td className="fw-bold text-white">₹{p.amount}</td>
                      <td><span className="badge bg-dark border border-secondary">{p.paymentMethod?.toUpperCase()}</span></td>
                      <td>
                        <span className={`badge rounded-pill px-2 py-1 border ${
                          p.status === 'completed' ? 'bg-success-subtle text-success border-success' :
                          p.status === 'failed' ? 'bg-danger-subtle text-danger border-danger' :
                          'bg-warning-subtle text-warning border-warning'
                        }`}>
                          {p.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
