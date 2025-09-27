import React from 'react';

const VerseComponent = ({ 
  verse, 
  verseIndex, 
  isArabic = false,
  isUrdu = false,
  isTafsir = false,
  isHighlighted = false,
  isPlaying = false,
  isBookmarked = false,
  onVerseClick,
  onBookmarkToggle,
  onTafsirClick,
  showBookmarkButton = true
}) => {
  const handleContainerClick = () => {
    if (isTafsir && onTafsirClick) {
      onTafsirClick(verseIndex);
    } else if (onVerseClick) {
      onVerseClick(verseIndex);
    }
  };

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    if (onBookmarkToggle) {
      onBookmarkToggle(verseIndex, verse);
    }
  };

  const getVerseNumber = () => {
    return verse.numberInSurah || verseIndex + 1;
  };

  const getVerseText = () => {
    return verse.text || '';
  };

  const getContainerClasses = () => {
    let classes = 'verse-container';
    if (isHighlighted) classes += ' highlighted';
    if (isPlaying) classes += ' playing';
    return classes;
  };

  const getTextClasses = () => {
    let classes = 'verse-text';
    if (isArabic) {
      classes += ' arabic-text';
    } else {
      classes += ' translation-text';
      if (isUrdu) classes += ' urdu';
    }
    return classes;
  };

  return (
    <div 
      className={getContainerClasses()}
      data-verse-number={getVerseNumber()}
      onClick={handleContainerClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="verse-number">
        {getVerseNumber()}
      </div>
      
      <div className={getTextClasses()}>
        {getVerseText()}
      </div>
      
      {showBookmarkButton && isArabic && (
        <button
          className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
          onClick={handleBookmarkClick}
          title={isBookmarked ? 'إزالة المرجعية' : 'إضافة مرجعية'}
        >
          {isBookmarked ? '★' : '☆'}
        </button>
      )}
    </div>
  );
};

export default VerseComponent;