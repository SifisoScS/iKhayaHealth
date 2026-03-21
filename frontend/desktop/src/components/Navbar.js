import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SyncStatus from './SyncStatus';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handleSync() {
    if (window.electronAPI?.triggerSync) {
      window.electronAPI.triggerSync();
    }
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">🏥</span>
        <span className="navbar-title">iKhaya Health</span>
      </div>

      <div className="navbar-links">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Dashboard
        </NavLink>
        <NavLink to="/patients" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Patients
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Users
          </NavLink>
        )}
      </div>

      <div className="navbar-right">
        <SyncStatus />
        <button className="btn-icon" onClick={handleSync} title="Sync now">⟳</button>
        {user && (
          <span className={`role-badge role-${user.role}`}>
            {user.role}
          </span>
        )}
        <span className="navbar-username">{user?.username}</span>
        <button className="btn-logout" onClick={handleLogout}>Sign out</button>
      </div>
    </nav>
  );
}
