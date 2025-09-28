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
    currentVerse,       
  totalVerses,  
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

  const getVerseNumber = () => verse.numberInSurah || verseIndex + 1;
  const getVerseText = () => verse.text || '';

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
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem 0' }}
    >
      {/* Verse number + text + bookmark */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div className="verse-number" style={{ fontWeight: 'bold', minWidth: '1.5rem', textAlign: 'center' }}>
          {getVerseNumber()}
        </div>

        <div className={getTextClasses()} style={{ flex: 1 }}>
          {getVerseText()}
        </div>

        {/* Bookmark button only for Arabic */}
        {showBookmarkButton && isArabic && (
          <button
            className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
            onClick={handleBookmarkClick}
            title={isBookmarked ? 'إزالة المرجعية' : 'إضافة مرجعية'}
            style={{ marginLeft: '0.5rem', fontSize: '1.2rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            {isBookmarked ? '★' : '☆'}
          </button>
        )}
      </div>

      {/* Play/Pause button only below Arabic verses */}
{isArabic && !isTafsir && (
  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
    {/* Previous */}
    <button
      onClick={() => onVerseClick && onVerseClick(currentVerse - 1)}
      disabled={currentVerse === 0}
      style={{
        padding: '0.25rem 0.5rem',
        fontSize: '1rem',
        borderRadius: '8px',
        backgroundColor: 'var(--primary-green)',
        color: 'beige',
        cursor: currentVerse === 0 ? 'not-allowed' : 'pointer'
      }}
    >
      ⏮ Prev
    </button>

    {/* Play/Pause */}
    <button
      onClick={() => onVerseClick && onVerseClick(verseIndex)}
      style={{
        padding: '0.25rem 0.5rem',
        fontSize: '1rem',
        borderRadius: '8px',
        backgroundColor: isPlaying ? 'green' : 'var(--primary-green)',
        color: 'beige',
        cursor: 'pointer'
      }}
    >
      {isPlaying ? '⏸ Pause' : '▶ Play'}
    </button>

    {/* Next */}
    <button
      onClick={() => onVerseClick && onVerseClick(currentVerse + 1)}
      disabled={currentVerse >= totalVerses - 1}
      style={{
        padding: '0.25rem 0.5rem',
        fontSize: '1rem',
        borderRadius: '8px',
        backgroundColor: 'var(--primary-green)',
        color: 'beige',
        cursor: currentVerse >= totalVerses - 1 ? 'not-allowed' : 'pointer'
      }}
    >
      ⏭ Next
    </button>
  </div>
)}

    </div>
  );
};

export default VerseComponent;
