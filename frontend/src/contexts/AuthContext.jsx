import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);

let globalLogout = null;

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401 && globalLogout) {
    globalLogout();
  }
  return response;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    globalLogout = () => {
      setUser(null);
      localStorage.removeItem('isLoggedIn');
    };
    return () => {
      globalLogout = null;
    };
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const hasSession = localStorage.getItem('isLoggedIn') === 'true';
      if (!hasSession) {
        setLoading(false);
        return;
      }
      try {
        const currentUser = await authService.getMe();
        setUser(currentUser);
      } catch (err) {
        console.log('No active session restored:', err.message);
        localStorage.removeItem('isLoggedIn');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email, password, role) => {
    setError(null);
    try {
      const loggedInUser = await authService.login(email, password, role);
      setUser(loggedInUser);
      localStorage.setItem('isLoggedIn', 'true');
      return loggedInUser;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const signup = async (name, email, password, role) => {
    setError(null);
    try {
      const registeredUser = await authService.register(name, email, password, role);
      setUser(registeredUser);
      localStorage.setItem('isLoggedIn', 'true');
      return registeredUser;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    setError(null);
    localStorage.removeItem('isLoggedIn');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
