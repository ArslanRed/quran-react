// src/components/common/Notification.jsx
import React, { useEffect } from 'react';

const Notification = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`notification ${type} ${isVisible ? 'show' : ''}`}>
      {message}
    </div>
  );
};

export default Notification;