import React from 'react';

// Loading Component
const Loading = ({ message = 'جاري التحميل...', className = '' }) => (
  <div className={`loading ${className}`}>
    <div className="spinner"></div>
    {message}
  </div>
);

export default Loading;