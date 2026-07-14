import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import MapContainer from '../components/MapContainer';
import axios from 'axios';

export default function UserDashboard() {
  const { user, token, socket } = useAuth();
  
  // Locations search/live state
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [locating, setLocating] = useState(false);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDropoff, setSearchingDropoff] = useState(false);

  const [pickupLoc, setPickupLoc] = useState(null);
  const [dropoffLoc, setDropoffLoc] = useState(null);
  
  // Fare & Selection
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [estimates, setEstimates] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('sedan');
  
  // Extra booking features
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [donationAmount, setDonationAmount] = useState(0);
  
  // Cards management
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardBrand, setNewCardBrand] = useState('Visa');
  const [newCardName, setNewCardName] = useState('');
  const [addingCard, setAddingCard] = useState(false);
  
  // Active Ride state
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  
  // Simulation variables
  const [isSimulating, setIsSimulating] = useState(false);
  const [simEta, setSimEta] = useState(0);
  const simulationInterval = useRef(null);
  
  // History tab
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('book'); // 'book' | 'history' | 'cards'
  
  // Payment settling
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : '/api';
  const rideRoomJoined = useRef(null);

  useEffect(() => {
    fetchActiveRide();
    fetchHistory();
    fetchSavedCards();
    generateNearbyCabs(null);
  }, []);

  // Sync nearby cabs to follow pickup selection
  useEffect(() => {
    if (pickupLoc) {
      generateNearbyCabs(pickupLoc);
    }
  }, [pickupLoc]);

  // Listen to live socket events for updates
  useEffect(() => {
    if (socket) {
      socket.on('rideStatusUpdate', (updatedRide) => {
        console.log('Socket Ride Update:', updatedRide);
        setActiveRide(updatedRide);
        if (updatedRide.status === 'completed') {
          stopSimulation();
          fetchHistory();
        }
      });

      socket.on('driverLocationUpdate', (loc) => {
        setDriverLoc(loc);
      });

      socket.on('paymentStatusUpdate', (payment) => {
        if (payment.ride?._id === activeRide?._id) {
          setPaymentSuccess(payment);
          setActiveRide(null);
          setDriverLoc(null);
          fetchHistory();
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('rideStatusUpdate');
        socket.off('driverLocationUpdate');
        socket.off('paymentStatusUpdate');
      }
    };
  }, [socket, activeRide]);

  // Join ride rooms when matched
  useEffect(() => {
    if (socket && activeRide && rideRoomJoined.current !== activeRide._id) {
      socket.emit('joinRideRoom', activeRide._id);
      rideRoomJoined.current = activeRide._id;
    }
  }, [socket, activeRide]);

  // Handle auto-matching and simulation transitions
  useEffect(() => {
    if (activeRide) {
      if (activeRide.status === 'requested') {
        // Auto-assign and transition to 'accepted' after 2.5 seconds
        const timer = setTimeout(() => {
          updateRideStatusAPI('accepted');
        }, 2500);
        return () => clearTimeout(timer);
      }
      
      if (activeRide.status === 'accepted' && !isSimulating) {
        // Trigger automated simulation of driver moving to pickup
        startDriverSimulation(true);
      }

      if (activeRide.status === 'inprogress' && !isSimulating) {
        // Trigger automated simulation of ride moving to dropoff
        startDriverSimulation(false);
      }
    }
  }, [activeRide, isSimulating]);

  const fetchActiveRide = async () => {
    try {
      const res = await axios.get(`${API_URL}/rides/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.ride) {
        setActiveRide(res.data.ride);
        setPickupLoc(res.data.ride.pickupLocation);
        setPickupQuery(res.data.ride.pickupLocation.name);
        setDropoffLoc(res.data.ride.dropoffLocation);
        setDropoffQuery(res.data.ride.dropoffLocation.name);
        if (res.data.ride.driver && res.data.ride.driver.currentLocation) {
          setDriverLoc(res.data.ride.driver.currentLocation);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/rides/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHistory(res.data.rides);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSavedCards = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/cards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSavedCards(res.data.savedCards);
        if (res.data.savedCards.length > 0) {
          setSelectedCardId(res.data.savedCards[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate randomized nearby cabs for map decorations
  const generateNearbyCabs = (center) => {
    const centerLat = center ? center.lat : 12.9716;
    const centerLng = center ? center.lng : 77.5946;
    const cabs = Array.from({ length: 6 }, (_, i) => ({
      name: `Cab #${Math.round(Math.random() * 900) + 100}`,
      vehicleType: i % 3 === 0 ? 'bike' : i % 3 === 1 ? 'sedan' : 'suv',
      rating: (4.2 + Math.random() * 0.8).toFixed(1),
      vehicleNumber: `KA-51-M-${Math.round(Math.random() * 9000) + 1000}`,
      currentLocation: {
        lat: centerLat + (Math.random() - 0.5) * 0.05,
        lng: centerLng + (Math.random() - 0.5) * 0.05
      }
    }));
    setNearbyDrivers(cabs);
  };

  // Live Location Fetcher using Geolocation API
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`);
          const data = await res.json();
          const addressName = data.display_name || `Live Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          setPickupLoc({ name: addressName, lat: latitude, lng: longitude });
          setPickupQuery(addressName);
        } catch (err) {
          console.error(err);
          const fallbackName = `Live Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          setPickupLoc({ name: fallbackName, lat: latitude, lng: longitude });
          setPickupQuery(fallbackName);
        } finally {
          setLocating(false);
          setEstimates(null);
        }
      },
      (error) => {
        console.error(error);
        alert(`Failed to retrieve live location: ${error.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Nominatim Address Search for India
  const handleSearchAddress = async (query, isPickup) => {
    if (!query || query.trim() === '') return;
    if (isPickup) setSearchingPickup(true);
    else setSearchingDropoff(true);

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&limit=5`);
      const data = await res.json();
      if (isPickup) {
        setPickupSuggestions(data);
      } else {
        setDropoffSuggestions(data);
      }
    } catch (err) {
      console.error(err);
      alert('Geocoding search failed. Please check network connection.');
    } finally {
      if (isPickup) setSearchingPickup(false);
      else setSearchingDropoff(false);
    }
  };

  const handleSelectSuggestion = (item, isPickup) => {
    const locObj = {
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    };
    if (isPickup) {
      setPickupLoc(locObj);
      setPickupQuery(item.display_name);
      setPickupSuggestions([]);
    } else {
      setDropoffLoc(locObj);
      setDropoffQuery(item.display_name);
      setDropoffSuggestions([]);
    }
    setEstimates(null);
  };

  // Map Click placing pins (and reverse geocodes addresses dynamically!)
  const handleMapClick = async (latlng) => {
    if (activeRide) return;
    const tempName = `Selected Pin (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`;

    if (!pickupLoc) {
      setPickupLoc({ name: tempName, lat: latlng.lat, lng: latlng.lng });
      setPickupQuery(tempName);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18`);
        const data = await res.json();
        const realName = data.display_name || tempName;
        setPickupLoc({ name: realName, lat: latlng.lat, lng: latlng.lng });
        setPickupQuery(realName);
      } catch (err) {
        console.error(err);
      }
    } else if (!dropoffLoc) {
      setDropoffLoc({ name: tempName, lat: latlng.lat, lng: latlng.lng });
      setDropoffQuery(tempName);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18`);
        const data = await res.json();
        const realName = data.display_name || tempName;
        setDropoffLoc({ name: realName, lat: latlng.lat, lng: latlng.lng });
        setDropoffQuery(realName);
      } catch (err) {
        console.error(err);
      }
    } else {
      setPickupLoc({ name: tempName, lat: latlng.lat, lng: latlng.lng });
      setPickupQuery(tempName);
      setDropoffLoc(null);
      setDropoffQuery('');
      setEstimates(null);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18`);
        const data = await res.json();
        const realName = data.display_name || tempName;
        setPickupLoc({ name: realName, lat: latlng.lat, lng: latlng.lng });
        setPickupQuery(realName);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const fetchEstimates = async () => {
    if (!pickupLoc || !dropoffLoc) return;
    setLoadingEstimate(true);
    try {
      const res = await axios.get(`${API_URL}/rides/estimate`, {
        params: {
          pickupLat: pickupLoc.lat,
          pickupLng: pickupLoc.lng,
          dropoffLat: dropoffLoc.lat,
          dropoffLng: dropoffLoc.lng
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setEstimates(res.data);
        applyDiscountCode(res.data.estimates[selectedVehicle].fare);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEstimate(false);
    }
  };

  // Live Apply Promo code
  const applyPromo = () => {
    if (!estimates) return;
    const baseFare = estimates.estimates[selectedVehicle].fare;
    applyDiscountCode(baseFare);
  };

  const applyDiscountCode = (base) => {
    if (promoCode.toUpperCase() === 'WELCOME5') {
      setDiscountAmount(50.00); // 50 Rupees discount
      setAppliedPromo('WELCOME5');
    } else if (promoCode.toUpperCase() === 'UCAB20') {
      setDiscountAmount(parseFloat((base * 0.2).toFixed(2)));
      setAppliedPromo('UCAB20');
    } else {
      setDiscountAmount(0);
      setAppliedPromo('');
      if (promoCode !== '') alert('Invalid Promo Code!');
    }
  };

  // Add Saved card
  const handleAddCard = async (e) => {
    e.preventDefault();
    if (newCardNumber.length < 4 || newCardName.trim() === '') return;
    setAddingCard(true);
    try {
      const last4 = newCardNumber.slice(-4);
      const res = await axios.post(`${API_URL}/auth/cards/add`, {
        cardBrand: newCardBrand,
        last4,
        cardholderName: newCardName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSavedCards(res.data.savedCards);
        setNewCardNumber('');
        setNewCardName('');
        alert('Payment card saved successfully.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingCard(false);
    }
  };

  // Remove saved card
  const handleDeleteCard = async (cardId) => {
    try {
      const res = await axios.delete(`${API_URL}/auth/cards/${cardId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSavedCards(res.data.savedCards);
        if (selectedCardId === cardId && res.data.savedCards.length > 0) {
          setSelectedCardId(res.data.savedCards[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Request cab ride
  const bookRide = async () => {
    if (!estimates || !selectedVehicle) return;
    setBookingLoading(true);
    try {
      const selected = estimates.estimates[selectedVehicle];
      const res = await axios.post(`${API_URL}/rides/book`, {
        pickupLocation: {
          name: pickupLoc.name,
          lat: pickupLoc.lat,
          lng: pickupLoc.lng
        },
        dropoffLocation: {
          name: dropoffLoc.name,
          lat: dropoffLoc.lat,
          lng: dropoffLoc.lng
        },
        vehicleType: selectedVehicle,
        baseFare: selected.fare,
        promoApplied: appliedPromo,
        discountAmount,
        donationAmount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setActiveRide(res.data.ride);
        setPaymentSuccess(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to book cab.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Buy refreshments during trip (Rupees pricing)
  const buyDrinkOrSnack = async (item, price) => {
    if (!activeRide) return;
    try {
      const res = await axios.post(`${API_URL}/rides/buy-refreshment`, {
        rideId: activeRide._id,
        item,
        price,
        qty: 1
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setActiveRide(res.data.ride);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Ride status helper
  const updateRideStatusAPI = async (status) => {
    if (!activeRide) return;
    try {
      const res = await axios.put(`${API_URL}/rides/status`, {
        rideId: activeRide._id,
        status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setActiveRide(res.data.ride);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Complete Payment automatically using selected saved card
  const handleAutoPayment = async () => {
    if (savedCards.length === 0) {
      alert('Please add a saved payment method first under the Payment Cards tab!');
      return;
    }
    setPaymentLoading(true);
    try {
      const card = savedCards.find(c => c._id === selectedCardId);
      const methodText = card ? `${card.cardBrand} ending in ${card.last4}` : 'Saved Card';
      
      const res = await axios.post(`${API_URL}/payments/process`, {
        rideId: activeRide._id,
        paymentMethod: 'card'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPaymentSuccess({
          ...res.data.payment,
          paymentMethod: methodText
        });
        setActiveRide(null);
        setDriverLoc(null);
        fetchHistory();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Automated Driver GPS Simulation Loop
  const stopSimulation = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }
    setIsSimulating(false);
    setSimEta(0);
  };

  const startDriverSimulation = (headingToPickup) => {
    if (!activeRide || isSimulating) return;

    setIsSimulating(true);
    // Spawns driver close to pickup location dynamically (roughly 1.2km offset)
    let startLat = headingToPickup ? activeRide.pickupLocation.lat - 0.012 : activeRide.pickupLocation.lat;
    let startLng = headingToPickup ? activeRide.pickupLocation.lng - 0.012 : activeRide.pickupLocation.lng;
    
    const endLat = headingToPickup ? activeRide.pickupLocation.lat : activeRide.dropoffLocation.lat;
    const endLng = headingToPickup ? activeRide.pickupLocation.lng : activeRide.dropoffLocation.lng;

    const steps = 12;
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

      // Emit driver location updates via Socket to trigger mapping updates
      if (socket) {
        socket.emit('updateLocation', {
          rideId: activeRide._id,
          userId: activeRide.driver?._id || 'driver-mock-id',
          lat: nextLat,
          lng: nextLng
        });
      }

      if (currentStep >= steps) {
        stopSimulation();
        // Advance trip state
        if (headingToPickup) {
          updateRideStatusAPI('pickup');
        } else {
          updateRideStatusAPI('completed');
        }
      }
    }, 1500);
  };

  // Live total calculation for estimated box
  const liveEstBase = estimates ? estimates.estimates[selectedVehicle].fare : 0;
  const liveEstTotal = Math.max(10, liveEstBase - discountAmount + donationAmount);

  return (
    <div className="container py-4">
      {/* Tab Selectors */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h2 className="text-glow text-white">Ucab Hailing Portal</h2>
        <div className="btn-group border border-secondary rounded-pill p-1 bg-dark">
          <button 
            onClick={() => setActiveTab('book')} 
            className={`btn btn-sm px-4 rounded-pill border-0 ${activeTab === 'book' ? 'glow-btn' : 'text-secondary'}`}
          >
            Book A Ride
          </button>
          <button 
            onClick={() => setActiveTab('cards')} 
            className={`btn btn-sm px-4 rounded-pill border-0 ${activeTab === 'cards' ? 'glow-btn' : 'text-secondary'}`}
          >
            Payment Cards
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`btn btn-sm px-4 rounded-pill border-0 ${activeTab === 'history' ? 'glow-btn' : 'text-secondary'}`}
          >
            Booking History
          </button>
        </div>
      </div>

      {activeTab === 'book' && (
        <div className="row g-4">
          {/* Left panel: booking panel / active status */}
          <div className="col-lg-5">
            <div className="glass-panel p-4 h-100 d-flex flex-column gap-3">
              
              {paymentSuccess && (
                <div className="alert alert-success border-0 bg-success-subtle text-success p-3 rounded-3 mb-2">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-patch-check-fill fs-4 text-glow-success"></i>
                    <strong className="fs-5">Payment Completed Automatically!</strong>
                  </div>
                  <div className="small">
                    <strong>Transaction ID:</strong> {paymentSuccess.transactionId}<br />
                    <strong>Charged Amount:</strong> ₹{paymentSuccess.amount}<br />
                    <strong>Charged Card:</strong> {paymentSuccess.paymentMethod}
                  </div>
                </div>
              )}

              {activeRide ? (
                /* Active ride panel */
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="badge bg-indigo text-white px-3 py-2 rounded-pill">
                      🚕 STATUS: {activeRide.status.toUpperCase()}
                    </span>
                    {isSimulating && simEta > 0 && (
                      <span className="small text-secondary pulsing-glow">
                        ETA: ~{simEta}s
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-dark rounded-3 border border-secondary">
                    <div className="d-flex justify-content-between mb-2">
                      <strong className="text-white">Dave Driver (Sedan)</strong>
                      <span className="text-warning">★ 4.9</span>
                    </div>
                    <div className="text-secondary small mb-2">Plate: {activeRide.driver?.vehicleNumber || 'KA-51-AB-1234'}</div>
                    <div className="text-secondary small">
                      <strong>From:</strong> {activeRide.pickupLocation.name}<br />
                      <strong>To:</strong> {activeRide.dropoffLocation.name}
                    </div>
                  </div>

                  {/* Simulations stages displays */}
                  {activeRide.status === 'requested' && (
                    <div className="text-center py-4 bg-dark rounded border border-secondary">
                      <div className="spinner-border text-indigo mb-3" role="status"></div>
                      <h6 className="text-white">Hailing Dave Driver...</h6>
                      <p className="text-secondary small mb-0">Matching with nearest cab automatically.</p>
                    </div>
                  )}

                  {activeRide.status === 'accepted' && (
                    <div className="text-center py-4 bg-dark rounded border border-secondary">
                      <h6 className="text-success text-glow-success mb-2">Driver Dave accepted booking!</h6>
                      <p className="text-secondary small mb-0"> Dave is heading to pick you up. Watch him move on the map.</p>
                    </div>
                  )}

                  {activeRide.status === 'pickup' && (
                    <div className="text-center py-4 bg-dark rounded border border-secondary p-3">
                      <h6 className="text-warning mb-3 text-glow">Dave Driver has arrived!</h6>
                      <p className="text-secondary small mb-3">Please hop in. Click below to start your trip.</p>
                      <button 
                        onClick={() => updateRideStatusAPI('inprogress')} 
                        className="btn glow-btn btn-sm px-4 rounded-pill"
                      >
                        Start Trip (Onboard)
                      </button>
                    </div>
                  )}

                  {/* Trip in progress with refreshments purchase menu! */}
                  {activeRide.status === 'inprogress' && (
                    <div className="d-flex flex-column gap-3">
                      <div className="text-center py-3 bg-dark rounded border border-success">
                        <div className="spinner-grow text-success spinner-grow-sm me-2 pulsing-glow" role="status"></div>
                        <span className="text-white fw-bold">Trip in Progress...</span>
                      </div>

                      {/* Buy refreshments in Rupees */}
                      <div className="p-3 bg-dark rounded border border-secondary">
                        <h6 className="text-glow text-white mb-3 small fw-bold">🥤 Buy Refreshments during the ride</h6>
                        <div className="row g-2">
                          <div className="col-4">
                            <button 
                              onClick={() => buyDrinkOrSnack('Cold Mineral Water', 20.00)} 
                              className="btn btn-outline-info btn-sm w-100 rounded-pill py-2"
                              style={{ fontSize: '10px' }}
                            >
                              💧 Water (₹20)
                            </button>
                          </div>
                          <div className="col-4">
                            <button 
                              onClick={() => buyDrinkOrSnack('Fizzy Soda', 40.00)} 
                              className="btn btn-outline-info btn-sm w-100 rounded-pill py-2"
                              style={{ fontSize: '10px' }}
                            >
                              🥤 Soda (₹40)
                            </button>
                          </div>
                          <div className="col-4">
                            <button 
                              onClick={() => buyDrinkOrSnack('Energy Bar', 60.00)} 
                              className="btn btn-outline-info btn-sm w-100 rounded-pill py-2"
                              style={{ fontSize: '10px' }}
                            >
                              🍪 Snack (₹60)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Refreshments Purchased list */}
                      {activeRide.refreshments && activeRide.refreshments.length > 0 && (
                        <div className="p-3 bg-dark rounded border border-secondary small text-secondary">
                          <strong className="text-white mb-2 d-block">Refreshments Purchased:</strong>
                          {activeRide.refreshments.map((ref, idx) => (
                            <div key={idx} className="d-flex justify-content-between mb-1">
                              <span>{ref.item} x{ref.qty}</span>
                              <span className="text-white">₹{ref.price * ref.qty}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trip completed. auto pay card display */}
                  {activeRide.status === 'completed' && (
                    <div className="p-4 bg-dark rounded border border-success text-center d-flex flex-column gap-3">
                      <h5 className="text-success text-glow-success">Arrived Safely at Destination!</h5>
                      
                      <div className="bg-black rounded p-3 text-start border border-secondary">
                        <div className="d-flex justify-content-between small text-secondary">
                          <span>Base Cab Fare:</span>
                          <span className="text-white">₹{activeRide.baseFare}</span>
                        </div>
                        {activeRide.discountAmount > 0 && (
                          <div className="d-flex justify-content-between small text-danger">
                            <span>Discount ({activeRide.promoApplied}):</span>
                            <span>-₹{activeRide.discountAmount}</span>
                          </div>
                        )}
                        {activeRide.donationAmount > 0 && (
                          <div className="d-flex justify-content-between small text-success">
                            <span>Donation:</span>
                            <span>+₹{activeRide.donationAmount}</span>
                          </div>
                        )}
                        {activeRide.refreshmentsTotal > 0 && (
                          <div className="d-flex justify-content-between small text-info">
                            <span>Refreshments total:</span>
                            <span>+₹{activeRide.refreshmentsTotal}</span>
                          </div>
                        )}
                        <hr className="border-secondary my-2" />
                        <div className="d-flex justify-content-between fw-bold fs-4 text-white">
                          <span>Total Fare:</span>
                          <span>₹{activeRide.fare}</span>
                        </div>
                      </div>

                      {/* Auto payment method selector */}
                      <div className="text-start">
                        <label className="form-label text-secondary small">Charge to Saved Card</label>
                        {savedCards.length === 0 ? (
                          <div className="alert alert-warning border-0 p-2.5 rounded small mb-3">
                            ⚠️ No saved cards found. Please click the <strong>Payment Cards</strong> tab above and save a card to pay automatically!
                          </div>
                        ) : (
                          <select 
                            className="form-select custom-input mb-3"
                            value={selectedCardId}
                            onChange={(e) => setSelectedCardId(e.target.value)}
                          >
                            {savedCards.map(c => (
                              <option key={c._id} value={c._id}>
                                {c.cardBrand} ending in {c.last4} ({c.cardholderName})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <button 
                        onClick={handleAutoPayment} 
                        disabled={paymentLoading || savedCards.length === 0}
                        className="btn glow-btn btn-lg w-100 py-3 rounded-pill"
                      >
                        {paymentLoading ? (
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        ) : null}
                        Authorize Automatic Payment
                      </button>
                    </div>
                  )}

                  {/* Active Live billing breakdown */}
                  {activeRide.status !== 'completed' && (
                    <div className="p-3 bg-dark rounded border border-secondary text-secondary small">
                      <strong className="text-white d-block mb-1">Live Fare Breakdown:</strong>
                      <div className="d-flex justify-content-between">
                        <span>Base Ride Fare:</span>
                        <span className="text-white">₹{activeRide.baseFare}</span>
                      </div>
                      {activeRide.discountAmount > 0 && (
                        <div className="d-flex justify-content-between text-danger">
                          <span>Discount ({activeRide.promoApplied}):</span>
                          <span>-₹{activeRide.discountAmount}</span>
                        </div>
                      )}
                      {activeRide.donationAmount > 0 && (
                        <div className="d-flex justify-content-between text-success">
                          <span>Donation:</span>
                          <span>+₹{activeRide.donationAmount}</span>
                        </div>
                      )}
                      {activeRide.refreshmentsTotal > 0 && (
                        <div className="d-flex justify-content-between text-info">
                          <span>Refreshments:</span>
                          <span>+₹{activeRide.refreshmentsTotal}</span>
                        </div>
                      )}
                      <hr className="border-secondary my-2" />
                      <div className="d-flex justify-content-between fw-bold text-white fs-5">
                        <span>Current Fare:</span>
                        <span>₹{activeRide.fare}</span>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => { updateRideStatusAPI('cancelled'); }}
                    className="btn btn-outline-danger btn-sm rounded-pill py-2 mt-2"
                  >
                    Cancel Booking
                  </button>

                </div>
              ) : (
                /* Booking Panel */
                <div className="d-flex flex-column gap-3">
                  <h3 className="text-white mb-1">Request Cab</h3>
                  <p className="text-secondary small mb-2">Pin locations on map or search for any spot in India.</p>

                  {/* Live Search Pickup Box */}
                  <div className="position-relative">
                    <label className="form-label text-secondary small">Pickup point</label>
                    <div className="input-group">
                      <input 
                        type="text" 
                        className="form-control custom-input" 
                        placeholder="Search pickup address in India..."
                        value={pickupQuery}
                        onChange={(e) => {
                          setPickupQuery(e.target.value);
                          if (e.target.value === '') setPickupLoc(null);
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={handleLocateUser} 
                        disabled={locating}
                        className="btn btn-outline-info"
                        title="Use Live Location"
                      >
                        {locating ? '📡' : '🎯'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleSearchAddress(pickupQuery, true)}
                        className="btn btn-outline-indigo px-3"
                        disabled={searchingPickup}
                      >
                        {searchingPickup ? '...' : 'Search'}
                      </button>
                    </div>
                    {pickupSuggestions.length > 0 && (
                      <div className="bg-dark border border-secondary rounded mt-1 position-absolute w-100 shadow-lg" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                        {pickupSuggestions.map((s, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => handleSelectSuggestion(s, true)}
                            className="p-2.5 text-white small cursor-pointer hover-bg border-bottom border-secondary text-truncate"
                            style={{ cursor: 'pointer' }}
                          >
                            📍 {s.display_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Live Search Dropoff Box */}
                  <div className="position-relative">
                    <label className="form-label text-secondary small">Dropoff point</label>
                    <div className="input-group">
                      <input 
                        type="text" 
                        className="form-control custom-input" 
                        placeholder="Search destination in India..."
                        value={dropoffQuery}
                        onChange={(e) => {
                          setDropoffQuery(e.target.value);
                          if (e.target.value === '') setDropoffLoc(null);
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={() => handleSearchAddress(dropoffQuery, false)}
                        className="btn btn-outline-indigo px-3"
                        disabled={searchingDropoff}
                      >
                        {searchingDropoff ? '...' : 'Search'}
                      </button>
                    </div>
                    {dropoffSuggestions.length > 0 && (
                      <div className="bg-dark border border-secondary rounded mt-1 position-absolute w-100 shadow-lg" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                        {dropoffSuggestions.map((s, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => handleSelectSuggestion(s, false)}
                            className="p-2.5 text-white small cursor-pointer hover-bg border-bottom border-secondary text-truncate"
                            style={{ cursor: 'pointer' }}
                          >
                            🏁 {s.display_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button 
                      onClick={fetchEstimates} 
                      disabled={!pickupLoc || !dropoffLoc || loadingEstimate}
                      className="btn btn-outline-light w-100 py-2.5 rounded-pill mt-2"
                    >
                      {loadingEstimate ? (
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      ) : null}
                      Check Fare & Cabs
                    </button>
                    {(pickupLoc || dropoffLoc) && (
                      <button 
                        onClick={() => { setPickupLoc(null); setDropoffLoc(null); setPickupQuery(''); setDropoffQuery(''); setEstimates(null); }}
                        className="btn btn-outline-danger px-3 rounded-pill mt-2"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {estimates && (
                    <div className="mt-2 d-flex flex-column gap-3">
                      
                      {/* Cab selection list */}
                      <div>
                        <label className="form-label text-secondary small">Select Cab Category</label>
                        <div className="d-flex flex-column gap-2">
                          {Object.values(estimates.estimates).map((est) => (
                            <div 
                              key={est.vehicleType}
                              onClick={() => { setSelectedVehicle(est.vehicleType); applyDiscountCode(est.fare); }}
                              className={`p-3 rounded-3 border d-flex justify-content-between align-items-center cursor-pointer transition ${
                                selectedVehicle === est.vehicleType 
                                  ? 'bg-indigo border-indigo' 
                                  : 'bg-dark border-secondary'
                              }`}
                              style={{ 
                                cursor: 'pointer',
                                background: selectedVehicle === est.vehicleType ? 'rgba(99,102,241,0.15)' : '',
                                borderColor: selectedVehicle === est.vehicleType ? 'var(--accent-primary)' : ''
                              }}
                            >
                              <div className="d-flex align-items-center gap-3">
                                <span className="fs-3">{est.vehicleType === 'bike' ? '🏍️' : est.vehicleType === 'suv' ? '🚙' : '🚗'}</span>
                                <div>
                                  <div className="text-white fw-bold small">{est.name}</div>
                                  <div className="text-secondary x-small" style={{ fontSize: '11px' }}>ETA: {est.eta} mins away</div>
                                </div>
                              </div>
                              <div className="text-white fw-bold fs-5">₹{est.fare}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Promo Codes */}
                      <div>
                        <label className="form-label text-secondary small">Apply Promo Code</label>
                        <div className="input-group">
                          <input 
                            type="text" 
                            className="form-control custom-input" 
                            placeholder="e.g. WELCOME5, UCAB20"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                          />
                          <button onClick={applyPromo} className="btn btn-outline-indigo" type="button">Apply</button>
                        </div>
                        {appliedPromo && <span className="badge bg-success-subtle text-success border border-success mt-1 rounded-pill px-2 py-1 small">Promo applied: {appliedPromo} (-₹{discountAmount})</span>}
                      </div>

                      {/* Donations options (Rupees) */}
                      <div>
                        <label className="form-label text-secondary small">Donate to Green Earth Foundation</label>
                        <div className="btn-group w-100 bg-dark rounded border border-secondary p-1">
                          <button 
                            type="button" 
                            onClick={() => setDonationAmount(0)}
                            className={`btn btn-xs rounded-pill py-1.5 border-0 ${donationAmount === 0 ? 'btn-secondary text-white' : 'text-secondary'}`}
                            style={{ fontSize: '11px' }}
                          >
                            No thanks
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setDonationAmount(10)}
                            className={`btn btn-xs rounded-pill py-1.5 border-0 ${donationAmount === 10 ? 'btn-success text-white' : 'text-secondary'}`}
                            style={{ fontSize: '11px' }}
                          >
                            +₹10
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setDonationAmount(20)}
                            className={`btn btn-xs rounded-pill py-1.5 border-0 ${donationAmount === 20 ? 'btn-success text-white' : 'text-secondary'}`}
                            style={{ fontSize: '11px' }}
                          >
                            +₹20
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setDonationAmount(50)}
                            className={`btn btn-xs rounded-pill py-1.5 border-0 ${donationAmount === 50 ? 'btn-success text-white' : 'text-secondary'}`}
                            style={{ fontSize: '11px' }}
                          >
                            +₹50
                          </button>
                        </div>
                      </div>

                      {/* Fare Breakdown summary in Rupees */}
                      <div className="bg-black rounded-3 p-3 border border-secondary small">
                        <div className="d-flex justify-content-between text-secondary">
                          <span>Base Cab Fare:</span>
                          <span className="text-white">₹{liveEstBase}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="d-flex justify-content-between text-danger">
                            <span>Discount Applied:</span>
                            <span>-₹{discountAmount}</span>
                          </div>
                        )}
                        {donationAmount > 0 && (
                          <div className="d-flex justify-content-between text-success">
                            <span>Donation:</span>
                            <span>+₹{donationAmount}</span>
                          </div>
                        )}
                        <hr className="border-secondary my-1.5" />
                        <div className="d-flex justify-content-between fw-bold text-white fs-5">
                          <span>Est. Total:</span>
                          <span>₹{liveEstTotal}</span>
                        </div>
                      </div>

                      <button 
                        onClick={bookRide}
                        disabled={bookingLoading}
                        className="btn glow-btn w-100 py-3 rounded-pill"
                      >
                        {bookingLoading ? (
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        ) : null}
                        Book Cab Now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Live Map */}
          <div className="col-lg-7" style={{ minHeight: '500px' }}>
            <MapContainer 
              pickup={pickupLoc} 
              dropoff={dropoffLoc} 
              driverLocation={driverLoc}
              nearbyDrivers={nearbyDrivers}
              onMapClick={handleMapClick}
            />
          </div>
        </div>
      )}

      {activeTab === 'cards' && (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="glass-panel p-4">
              <h3 className="text-white text-glow mb-4">Save Payment Card</h3>
              <form onSubmit={handleAddCard}>
                <div className="mb-3">
                  <label className="form-label text-secondary small">Card Provider</label>
                  <select 
                    className="form-select custom-input"
                    value={newCardBrand}
                    onChange={(e) => setNewCardBrand(e.target.value)}
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">American Express</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label text-secondary small">Cardholder Name</label>
                  <input 
                    type="text" 
                    required
                    className="form-control custom-input" 
                    placeholder="John Rider"
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label text-secondary small">16-Digit Card Number</label>
                  <input 
                    type="text" 
                    required
                    maxLength="16"
                    className="form-control custom-input" 
                    placeholder="4111222233334444"
                    value={newCardNumber}
                    onChange={(e) => setNewCardNumber(e.target.value.replace(/\D/g,''))}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={addingCard}
                  className="btn glow-btn w-100 py-3 rounded-pill"
                >
                  {addingCard ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  ) : null}
                  Save & Secure Card
                </button>
              </form>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="glass-panel p-4 h-100">
              <h3 className="text-white text-glow mb-4">Saved Cards</h3>
              {savedCards.length === 0 ? (
                <div className="text-center text-secondary py-5">
                  <i className="bi bi-credit-card-2-front fs-1 mb-2 d-block"></i>
                  No payment methods stored yet.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {savedCards.map((card) => (
                    <div key={card._id} className="p-3 bg-dark rounded border border-secondary d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-3">
                        <span className="fs-3">💳</span>
                        <div>
                          <strong className="text-white">{card.cardBrand} ending in {card.last4}</strong>
                          <div className="text-secondary small">{card.cardholderName}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteCard(card._id)}
                        className="btn btn-sm btn-outline-danger rounded-pill px-3"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="glass-panel p-4">
          <h3 className="text-white text-glow mb-4">Ride Booking History</h3>
          {history.length === 0 ? (
            <div className="text-center text-secondary py-5">
              <i className="bi bi-calendar2-x fs-1 mb-2 d-block"></i>
              No booking records log. Start requesting rides!
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle border border-secondary mb-0">
                <thead>
                  <tr className="border-secondary text-secondary">
                    <th>Date</th>
                    <th>Locations</th>
                    <th>Breakdown</th>
                    <th>Paid Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice().reverse().map((ride) => (
                    <tr key={ride._id} className="border-secondary">
                      <td className="small">{new Date(ride.createdAt).toLocaleDateString()}</td>
                      <td className="small">
                        <div className="text-truncate" style={{ maxWidth: '220px' }}><strong>From:</strong> {ride.pickupLocation.name}</div>
                        <div className="text-truncate" style={{ maxWidth: '220px' }}><strong>To:</strong> {ride.dropoffLocation.name}</div>
                      </td>
                      <td className="small text-secondary">
                        <div>Base: ₹{ride.baseFare}</div>
                        {ride.discountAmount > 0 && <div className="text-danger">Promo: -₹{ride.discountAmount}</div>}
                        {ride.donationAmount > 0 && <div className="text-success">Donation: +₹{ride.donationAmount}</div>}
                        {ride.refreshmentsTotal > 0 && (
                          <div className="text-info">
                            Refreshments: +₹{ride.refreshmentsTotal}
                            <span 
                              className="d-block text-secondary text-xx-small" 
                              style={{ fontSize: '9px' }}
                            >
                              ({ride.refreshments.map(r => r.item).join(', ')})
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="fw-bold text-white">₹{ride.fare}</td>
                      <td>
                        <span className={`badge rounded-pill px-3 py-1.5 ${
                          ride.status === 'completed' ? 'bg-success-subtle text-success border border-success' :
                          ride.status === 'cancelled' ? 'bg-danger-subtle text-danger border border-danger' :
                          'bg-warning-subtle text-warning border border-warning'
                        }`}>
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
