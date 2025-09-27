import React from 'react';

// Header Component
 const Header = ({ currentPage, onPageChange }) => {
  const pages = [
    { id: 'quran', label: 'القرآن' },
    { id: 'bookmarks', label: 'المرجعيات' },
    { id: 'naat', label: 'النعت' }
  ];

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">القرآن الكريم - Holy Quran</div>
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