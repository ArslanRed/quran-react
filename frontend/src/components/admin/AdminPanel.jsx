// components/admin/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import adminAPI from '../../services/adminApi';

const AdminPanel = ({ showNotification }) => {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    if (adminAPI.isAuthenticated()) {
      // Token exists, assume user is logged in
      // In a real app, you'd decode the JWT to get user info
      setUser({ username: 'admin', role: 'admin' });
    }
    setIsCheckingAuth(false);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (isCheckingAuth) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Checking authentication...</p>
      </div>
    );
  }

  return (
    <div>
      {user ? (
        <AdminDashboard
          user={user}
          onLogout={handleLogout}
          showNotification={showNotification}
        />
      ) : (
        <AdminLogin
          onLoginSuccess={handleLoginSuccess}
          showNotification={showNotification}
        />
      )}
    </div>
  );
};

export default AdminPanel;