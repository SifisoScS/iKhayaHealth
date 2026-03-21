import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore user from localStorage on startup
    const stored = authService.getCurrentUser();
    if (stored && authService.isAuthenticated()) {
      setUser(stored);
    }
    setLoading(false);
  }, []);

  async function login(username, password) {
    const u = await authService.login(username, password);
    setUser(u);
    return u;
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
