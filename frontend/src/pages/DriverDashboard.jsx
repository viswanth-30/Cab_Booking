import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import MapContainer from '../components/MapContainer';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function DriverDashboard() {
  const { user, token, socket, toggleOnline, updateLocation } = useAuth();

  const [activeRide, setActiveRide] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);
  const [pendingRides, setPendingRides] = useState([]);
  const [activeTab, setActiveTab] = useState('rides');
  const [driverLoc, setDriverLoc] = useState(user?.currentLocation || null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simEta, setSimEta] = useState(0);
  const simulationInterval = useRef(null);

  const fetchDriverRides = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/rides/driver/rides`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const rides = res.data.rides;
        setPendingRides(rides.filter(r => r.status === 'requested'));
        setRideHistory(rides.filter(r => ['completed', 'cancelled'].includes(r.status)));
      }
    } catch (err) {
      // Silently handle — driver may not have rides yet
    }
  }, [token]);

  const fetchDriverActiveRide = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/rides/driver/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.ride) {
        setActiveRide(res.data.ride);
      }
    } catch (err) {
      // No active ride
    }
  }, [token]);

  const handleAcceptRide = async (rideId) => {
    try {
      const res = await axios.put(`${API_URL}/rides/driver/accept/${rideId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setActiveRide(res.data.ride);
        fetchDriverRides();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept ride');
    }
  };

  const handleRejectRide = async (rideId) => {
    try {
      await axios.put(`${API_URL}/rides/driver/reject/${rideId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDriverRides();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject ride');
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!activeRide) return;
    try {
      const res = await axios.put(`${API_URL}/rides/driver/status`, {
        rideId: activeRide._id,
        status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setActiveRide(res.data.ride);
        if (status === 'completed') {
          stopSimulation();
          setActiveRide(null);
          fetchDriverRides();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleToggleOnline = async () => {
    await toggleOnline();
  };

  // Use browser GPS to share live location
  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Use the Simulate button instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await updateLocation(latitude, longitude);
        setDriverLoc({ lat: latitude, lng: longitude });

        if (socket && activeRide) {
          socket.emit('updateLocation', {
            rideId: activeRide._id,
            userId: user._id,
            lat: latitude,
            lng: longitude
          });
        }
      },
      () => {
        alert('Could not get location. Use the Simulate Movement button instead.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Simulate driver movement when GPS is unavailable
  const stopSimulation = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }
    setIsSimulating(false);
    setSimEta(0);
  };

  const handleSimulateMovement = () => {
    if (!activeRide || isSimulating) return;

    setIsSimulating(true);
    const isHeadingToPickup = ['accepted'].includes(activeRide.status);
    const startLat = isHeadingToPickup
      ? activeRide.pickupLocation.lat - 0.012
      : activeRide.pickupLocation.lat;
    const startLng = isHeadingToPickup
      ? activeRide.pickupLocation.lng - 0.012
      : activeRide.pickupLocation.lng;
    const endLat = isHeadingToPickup ? activeRide.pickupLocation.lat : activeRide.dropoffLocation.lat;
    const endLng = isHeadingToPickup ? activeRide.pickupLocation.lng : activeRide.dropoffLocation.lng;

    const steps = 10;
    let currentStep = 0;
    setSimEta(steps);

    const deltaLat = (endLat - startLat) / steps;
    const deltaLng = (endLng - startLng) / steps;

    setDriverLoc({ lat: startLat, lng: startLng });

    simulationInterval.current = setInterval(() => {
      currentStep++;
      const nextLat = startLat + deltaLat * currentStep;
      const nextLng = startLng + deltaLng * currentStep;

      setDriverLoc({ lat: nextLat, lng: nextLng });
      setSimEta(steps - currentStep);

      if (socket) {
        socket.emit('updateLocation', {
          rideId: activeRide._id,
          userId: user._id,
          lat: nextLat,
          lng: nextLng
        });
      }

      if (currentStep >= steps) {
        stopSimulation();
        if (isHeadingToPickup) {
          handleUpdateStatus('pickup');
        }
      }
    }, 1500);
  };

  // Fetch rides on mount
  useEffect(() => {
    fetchDriverRides();
    fetchDriverActiveRide();
  }, [fetchDriverRides, fetchDriverActiveRide]);

  // Socket listeners for real-time ride updates
  useEffect(() => {
    if (socket) {
      socket.on('newRideRequest', (ride) => {
        fetchDriverRides();
        fetchDriverActiveRide();
      });

      socket.on('rideStatusUpdate', (ride) => {
        setActiveRide(prev => {
          if (prev && prev._id === ride._id) return ride;
          return prev;
        });
        fetchDriverRides();
      });

      return () => {
        socket.off('newRideRequest');
        socket.off('rideStatusUpdate');
      };
    }
  }, [socket, fetchDriverRides, fetchDriverActiveRide]);

  // Polling fallback — ensures rides appear even if sockets drop
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDriverRides();
      fetchDriverActiveRide();
    }, 8000); // poll every 8 seconds as a safety net
    return () => clearInterval(interval);
  }, [fetchDriverRides, fetchDriverActiveRide]);

  // Status progression labels
  const getStatusActions = () => {
    if (!activeRide) return null;

    switch (activeRide.status) {
      case 'accepted':
        return (
          <div className="d-flex flex-column gap-2">
            <button onClick={() => handleUpdateStatus('pickup')} className="btn glow-btn rounded-pill py-2">
              📍 Reached Pickup Location
            </button>
            <button onClick={handleSimulateMovement} disabled={isSimulating}
              className="btn btn-outline-warning btn-sm rounded-pill py-2">
              {isSimulating ? `⏳ Simulating... ETA: ~${simEta}s` : '🧪 Simulate Driver Movement (Demo)'}
            </button>
          </div>
        );
      case 'pickup':
        return (
          <button onClick={() => handleUpdateStatus('inprogress')} className="btn glow-btn rounded-pill py-2">
            🚗 Start Trip
          </button>
        );
      case 'inprogress':
        return (
          <div className="d-flex flex-column gap-2">
            <button onClick={() => handleUpdateStatus('completed')} className="btn btn-success rounded-pill py-2">
              ✅ Complete Trip
            </button>
            <button onClick={handleSimulateMovement} disabled={isSimulating}
              className="btn btn-outline-warning btn-sm rounded-pill py-2">
              {isSimulating ? `⏳ Simulating... ETA: ~${simEta}s` : '🧪 Simulate Driver Movement (Demo)'}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const statusColors = {
    requested: 'bg-warning-subtle text-warning border-warning',
    accepted: 'bg-info-subtle text-info border-info',
    pickup: 'bg-primary-subtle text-primary border-primary',
    inprogress: 'bg-success-subtle text-success border-success',
    completed: 'bg-success-subtle text-success border-success',
    cancelled: 'bg-danger-subtle text-danger border-danger'
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-glow text-white mb-1">Driver Dashboard</h2>
          <p className="text-secondary small mb-0">
            Welcome, {user?.name} •{' '}
            {user?.isVerified ? (
              <span className="text-success">✅ Verified</span>
            ) : (
              <span className="text-danger">❌ Not Verified — Contact Admin</span>
            )}
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <button
            onClick={handleToggleOnline}
            className={`btn rounded-pill px-4 py-2 fw-semibold ${user?.isOnline ? 'btn-success' : 'btn-outline-secondary'}`}
          >
            {user?.isOnline ? '🟢 Online' : '🔴 Offline'}
          </button>
          <button onClick={handleShareLocation} className="btn btn-outline-info rounded-pill px-3 py-2" title="Share GPS Location">
            📡 Share Location
          </button>
        </div>
      </div>

      {/* Verification Warning */}
      {!user?.isVerified && (
        <div className="alert alert-warning border-0 bg-warning-subtle text-warning p-3 rounded-3 mb-4 d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-triangle-fill fs-5"></i>
          <div>
            <strong>Account Not Verified</strong> — Your driver account needs admin verification before you can accept ride requests.
            Please contact the administrator at <strong>admin@ucab.com</strong>.
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="btn-group border border-secondary rounded-pill p-1 bg-dark mb-4">
        <button onClick={() => setActiveTab('rides')}
          className={`btn btn-sm px-4 rounded-pill border-0 ${activeTab === 'rides' ? 'glow-btn' : 'text-secondary'}`}>
          Ride Requests {pendingRides.length > 0 && <span className="badge bg-danger ms-1">{pendingRides.length}</span>}
        </button>
        <button onClick={() => setActiveTab('active')}
          className={`btn btn-sm px-4 rounded-pill border-0 ${activeTab === 'active' ? 'glow-btn' : 'text-secondary'}`}>
          Active Ride
        </button>
        <button onClick={() => setActiveTab('history')}
          className={`btn btn-sm px-4 rounded-pill border-0 ${activeTab === 'history' ? 'glow-btn' : 'text-secondary'}`}>
          Ride History
        </button>
      </div>

      {/* Pending Ride Requests */}
      {activeTab === 'rides' && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="glass-panel p-4">
              <h4 className="text-white text-glow mb-3">Incoming Requests</h4>
              {pendingRides.length === 0 ? (
                <div className="text-center text-secondary py-5">
                  <i className="bi bi-inbox fs-1 mb-2 d-block"></i>
                  No pending ride requests. Stay online to receive bookings.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {pendingRides.map(ride => (
                    <div key={ride._id} className="p-3 bg-dark rounded-3 border border-secondary">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <strong className="text-white">{ride.user?.name || 'Rider'}</strong>
                        <span className="text-white fw-bold">₹{ride.fare}</span>
                      </div>
                      <div className="text-secondary small mb-2">
                        <div><strong>From:</strong> {ride.pickupLocation?.name}</div>
                        <div><strong>To:</strong> {ride.dropoffLocation?.name}</div>
                      </div>
                      <div className="d-flex gap-2 mt-2">
                        <button onClick={() => handleAcceptRide(ride._id)}
                          className="btn btn-success btn-sm rounded-pill px-3 flex-fill">
                          ✅ Accept
                        </button>
                        <button onClick={() => handleRejectRide(ride._id)}
                          className="btn btn-outline-danger btn-sm rounded-pill px-3 flex-fill">
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="col-lg-7" style={{ minHeight: '400px' }}>
            <MapContainer
              pickup={pendingRides[0]?.pickupLocation || null}
              dropoff={pendingRides[0]?.dropoffLocation || null}
              driverLocation={driverLoc}
            />
          </div>
        </div>
      )}

      {/* Active Ride */}
      {activeTab === 'active' && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="glass-panel p-4">
              <h4 className="text-white text-glow mb-3">Active Ride</h4>
              {!activeRide ? (
                <div className="text-center text-secondary py-5">
                  <i className="bi bi-car-front fs-1 mb-2 d-block"></i>
                  No active ride. Accept a request to begin.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {/* Status badge */}
                  <div className="d-flex justify-content-between align-items-center">
                    <span className={`badge rounded-pill px-3 py-2 border ${statusColors[activeRide.status]}`}>
                      STATUS: {activeRide.status.toUpperCase()}
                    </span>
                    {isSimulating && simEta > 0 && (
                      <span className="small text-secondary pulsing-glow">ETA: ~{simEta}s</span>
                    )}
                  </div>

                  {/* Rider info */}
                  <div className="p-3 bg-dark rounded-3 border border-secondary">
                    <div className="d-flex justify-content-between mb-2">
                      <strong className="text-white">Rider: {activeRide.user?.name}</strong>
                      <span className="text-white fw-bold fs-5">₹{activeRide.fare}</span>
                    </div>
                    <div className="text-secondary small">
                      <div><strong>From:</strong> {activeRide.pickupLocation?.name}</div>
                      <div><strong>To:</strong> {activeRide.dropoffLocation?.name}</div>
                    </div>
                  </div>

                  {/* Action buttons based on status */}
                  {getStatusActions()}
                </div>
              )}
            </div>
          </div>
          <div className="col-lg-7" style={{ minHeight: '400px' }}>
            <MapContainer
              pickup={activeRide?.pickupLocation || null}
              dropoff={activeRide?.dropoffLocation || null}
              driverLocation={driverLoc}
            />
          </div>
        </div>
      )}

      {/* Ride History */}
      {activeTab === 'history' && (
        <div className="glass-panel p-4">
          <h4 className="text-white text-glow mb-3">Completed Rides</h4>
          {rideHistory.length === 0 ? (
            <div className="text-center text-secondary py-5">
              <i className="bi bi-calendar2-x fs-1 mb-2 d-block"></i>
              No ride history yet. Complete rides to see them here.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle border border-secondary mb-0">
                <thead>
                  <tr className="border-secondary text-secondary">
                    <th>Date</th>
                    <th>Rider</th>
                    <th>Route</th>
                    <th>Fare</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rideHistory.slice().reverse().map(ride => (
                    <tr key={ride._id} className="border-secondary">
                      <td className="small">{new Date(ride.createdAt).toLocaleDateString()}</td>
                      <td className="small">{ride.user?.name || 'N/A'}</td>
                      <td className="small">
                        <div className="text-truncate" style={{ maxWidth: '200px' }}>
                          {ride.pickupLocation?.name} → {ride.dropoffLocation?.name}
                        </div>
                      </td>
                      <td className="fw-bold text-white">₹{ride.fare}</td>
                      <td>
                        <span className={`badge rounded-pill px-3 py-1 border ${statusColors[ride.status]}`}>
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
    </div>
  );
}
