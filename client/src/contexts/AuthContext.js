'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext({
  user: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  loading: true
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize axios defaults
  useEffect(() => {
    axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL;
    axios.defaults.headers.post['Content-Type'] = 'application/json';
  }, []);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        // Validate token format
        if (!token.match(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/)) {
          console.error('Invalid token format');
          localStorage.removeItem('token');
          setLoading(false);
          return;
        }

        axios.defaults.headers.common['x-auth-token'] = token;
        const res = await axios.get('/api/auth/user');
        setUser(res.data);
      } catch (err) {
        console.error('Auth check error:', err.response?.data || err);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['x-auth-token'];
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const login = async (username, password) => {
    try {
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      console.log('Attempting login with:', { username });
      const res = await axios.post('/api/auth/login', {
        username: username.trim(),
        password: password.trim()
      });

      if (!res.data?.token) {
        throw new Error('No token received from server');
      }

      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['x-auth-token'] = res.data.token;
      setUser(res.data.user);
      return true;
    } catch (err) {
      console.error('Login error:', err.response?.data || err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to login';
      throw new Error(errorMessage);
    }
  };

  const register = async (username, email, password) => {
    try {
      console.log('Attempting registration with:', { username, email });
      const res = await axios.post('/api/auth/register', {
        username,
        email,
        password
      });
      console.log('Registration response:', res.data);
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['x-auth-token'] = res.data.token;
      setUser(res.data.user);
      return true;
    } catch (err) {
      console.error('Registration error:', err.response?.data || err.message);
      throw err.response?.data?.message || 'Failed to register';
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['x-auth-token'];
    setUser(null);
    window.location.href = '/';
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}