import React from 'react';

// Header Component
const Header = ({ currentPage, onPageChange }) => {
  const pages = [
    { id: 'quran', label: 'القرآن' },
    { id: 'bookmarks', label: 'المرجعيات' },
    { id: 'naat', label: 'النعت' },
     { id: 'admin', label: 'Admin' }
  ];

  // Determine logo based on current page
  const logoSrc = currentPage === 'naat' ? 'Noor-e-Naat.png' : 'Noor-e-Imaan-2.png';

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
  <img 
    src={logoSrc} 
    alt="Logo" 
    style={{ 
      height: '60px',   // or whatever matches your design
      width: 'auto',    // keeps the aspect ratio
      objectFit: 'contain'
    }} 
  />
</div>

        <nav className="nav-buttons">
          {pages.map(page => (
            <button
              key={page.id}
              className={`nav-btn ${currentPage === page.id ? 'active' : ''}`}
              onClick={() => onPageChange(page.id)}
            >
              {page.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
