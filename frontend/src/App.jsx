// App.js - Updated with Admin Panel
import React, { useState } from 'react';
import { Header } from './components/layout';
import { Footer } from './components/layout';
import { QuranPage } from './components/quran';
import { BookmarksPage } from './components/bookmarks';
import { NaatPage } from './components/naat';
import AdminPanel from './components/admin/AdminPanel'; // Add this
import { Notification } from './components/common';
import './styles/globals.css';

// Import your custom translation data
import customTranslationData from './data/customTranslation.json';

function App() {
  const [currentPage, setCurrentPage] = useState('quran');
  const [notification, setNotification] = useState({ message: '', type: '', show: false });

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const showPage = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="app">
      <Header currentPage={currentPage} onPageChange={showPage} />
      
      {currentPage === 'quran' && (
        <QuranPage 
          showNotification={showNotification} 
          customTranslationData={customTranslationData}
        />
      )}
      {currentPage === 'bookmarks' && (
        <BookmarksPage showNotification={showNotification} />
      )}
      {currentPage === 'naat' && (
        <NaatPage />
      )}
      {currentPage === 'admin' && (
        <AdminPanel showNotification={showNotification} />
      )}

      <Footer />
      <Notification {...notification} />
    </div>
  );
}

export default App;