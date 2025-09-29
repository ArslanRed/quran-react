// components/admin/AdminLogin.jsx
import React, { useState } from 'react';
import adminAPI from '../../services/adminApi';

const AdminLogin = ({ onLoginSuccess, showNotification }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await adminAPI.login(credentials.username, credentials.password);
      showNotification('Login successful!', 'success');
      onLoginSuccess(response.user);
    } catch (error) {
      showNotification(error.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>Admin Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Username:</label>
          <input
            type="text"
            value={credentials.username}
            onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label>Password:</label>
          <input
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          style={{ 
            width: '100%', 
            padding: '0.75rem', 
            backgroundColor: '#4CAF50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
        <p>Default credentials:</p>
        <p>Username: admin</p>
        <p>Password: Admin@123!</p>
      </div>
    </div>
  );
};
export default AdminLogin;