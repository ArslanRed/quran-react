import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../../hooks';
import QuranAPI from '../../services/quranApi';
import { RECITER_NAMES, TRANSLATIONS } from '../../utils/constants';

const Controls = ({ 
  surahs, 
  onSurahChange, 
  onReciterChange, 
  onTranslationChange,
  onVerseNavigation,
  currentReciter,
  currentTranslation,
  showNotification 
}) => {
  const [selectedSurah, setSelectedSurah] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [verseInput, setVerseInput] = useState('');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const searchRef = useRef(null);

  // Handle search
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchTerm.length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      try {
        const data = await QuranAPI.searchQuran(debouncedSearchTerm);
        if (data.matches && data.matches.length > 0) {
          setSearchResults(data.matches.slice(0, 10));
          setShowSearchResults(true);
        } else {
          setSearchResults([{ noResults: true }]);
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([{ error: true }]);
        setShowSearchResults(true);
      }
    };

    performSearch();
  }, [debouncedSearchTerm]);

  // Handle clicks outside search to close results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSurahChange = (e) => {
    const surahNumber = e.target.value;
    setSelectedSurah(surahNumber);
    if (surahNumber) {
      onSurahChange(parseInt(surahNumber));
    }
  };

  const handleSearchResultClick = (match) => {
    onVerseNavigation(match.surah.number, match.numberInSurah);
    setShowSearchResults(false);
    setSearchTerm('');
  };

  const handleVerseInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      const parsed = QuranAPI.parseVerseReference(verseInput);
      if (parsed) {
        onVerseNavigation(parsed.surahNumber, parsed.verseNumber);
        setVerseInput('');
      } else {
        showNotification('استخدم التنسيق: رقم السورة:رقم الآية', 'error');
      }
    }
  };

  const handleTranslationToggle = (translation) => {
    onTranslationChange(translation);
  };

  return (
    <div className="controls">
      <div className="controls-content">
        <div className="control-group">
          <label htmlFor="surah-select">السورة</label>
          <select 
            id="surah-select" 
            value={selectedSurah} 
            onChange={handleSurahChange}
          >
            <option value="">اختر السورة...</option>
            {surahs.map(surah => (
              <option key={surah.number} value={surah.number}>
                {surah.number}. {surah.name} - {surah.englishName}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="reciter-select">القارئ</label>
          <select 
            id="reciter-select" 
            value={currentReciter}
            onChange={(e) => onReciterChange(e.target.value)}
          >
            {Object.entries(RECITER_NAMES).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="search-input">البحث</label>
          <div className="search-container" ref={searchRef}>
            <input
              type="text"
              id="search-input"
              placeholder="ابحث في القرآن..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
            {showSearchResults && (
              <div className="search-results">
                {searchResults.map((result, index) => {
                  if (result.noResults) {
                    return (
                      <div key={index} className="search-result">
                        لا توجد نتائج
                      </div>
                    );
                  }
                  if (result.error) {
                    return (
                      <div key={index} className="search-result">
                        خطأ في البحث
                      </div>
                    );
                  }
                  return (
                    <div 
                      key={index} 
                      className="search-result"
                      onClick={() => handleSearchResultClick(result)}
                    >
                      <strong>
                        سورة {result.surah.name} ({result.numberInSurah})
                        {result.isCustomTranslation && <span style={{ color: '#666', fontSize: '0.8rem' }}> - English</span>}
                      </strong><br />
                      <span className={result.isCustomTranslation ? '' : 'arabic-text'} style={{ fontSize: '1rem' }}>
                        {result.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="control-group">
          <label htmlFor="verse-input">الآية</label>
          <input
            type="text"
            id="verse-input"
            placeholder="سورة:آية (مثال: 2:255)"
            value={verseInput}
            onChange={(e) => setVerseInput(e.target.value)}
            onKeyPress={handleVerseInputKeyPress}
          />
        </div>

        <div className="control-group">
          <label>الترجمة</label>
          <div className="translation-toggle">
            {Object.entries(TRANSLATIONS).map(([id, name]) => (
  <button
    key={id}
    className={`toggle-btn ${currentTranslation === id ? 'active' : ''}`}
    onClick={() => handleTranslationToggle(id)}
  >
    {id === 'en.custom' ? 'English' : 
     id === 'ur.jalandhry' ? 'اردو' : 'تفسير'}
  </button>
))}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;