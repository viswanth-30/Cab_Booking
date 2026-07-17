import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const AuthContext = createContext();

// Use environment variable for API URL, fallback to /api for production
const API_URL = import.meta.env.VITE_API_URL || '/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Axios instance with base URL
  const apiClient = axios.create({ baseURL: API_URL });

  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Fetch current user on mount / token change
  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data.user);
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };

    fetchMe();
  }, [token]);

  // Socket connection management
  useEffect(() => {
    if (user) {
      const socketConn = io(SOCKET_URL);

      socketConn.on('connect', () => {
        socketConn.emit('join', user._id);
      });

      setSocket(socketConn);

      return () => {
        socketConn.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [user]);

  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    if (res.data.success) {
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
  };

  const register = async (userData) => {
    const res = await axios.post(`${API_URL}/auth/register`, userData);
    if (res.data.success) {
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const toggleOnline = async () => {
    if (user && user.role === 'driver') {
      const res = await axios.put(`${API_URL}/auth/toggle-online`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setUser(prev => ({ ...prev, isOnline: res.data.isOnline }));
      }
      return res.data;
    }
  };

  const updateLocation = async (lat, lng) => {
    if (user && user.role === 'driver') {
      const res = await axios.put(`${API_URL}/auth/location`, { lat, lng }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setUser(prev => ({ ...prev, currentLocation: res.data.currentLocation }));
      }
      return res.data;
    }
  };

  const value = {
    user,
    token,
    loading,
    socket,
    apiClient,
    login,
    register,
    logout,
    toggleOnline,
    updateLocation
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
