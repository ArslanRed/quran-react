import React, { useState, useEffect, useCallback } from 'react';
import Controls from './Controls';
import AudioPlayer from './AudioPlayer';
import VerseComponent from './VerseComponent';
import SurahHeader from './SurahHeader';
import { Loading, ErrorComponent } from '../common';
import { useLocalStorage } from '../../hooks';
import QuranAPI from '../../services/quranAPI';
import { 
  DEFAULT_RECITER, 
  DEFAULT_TRANSLATION, 
  TRANSLATIONS,
  STORAGE_KEYS,
  KEYBOARD_SHORTCUTS 
} from '../../utils/constants';

const QuranPage = ({ showNotification }) => {
  const [surahs, setSurahs] = useState([]);
  const [currentSurah, setCurrentSurah] = useState(null);
  const [currentVerse, setCurrentVerse] = useState(0);
  const [currentReciter, setCurrentReciter] = useState(DEFAULT_RECITER);
  const [currentTranslation, setCurrentTranslation] = useState(DEFAULT_TRANSLATION);
  
  const [surahData, setSurahData] = useState(null);
  const [translationData, setTranslationData] = useState(null);
  
  const [loading, setLoading] = useState({
    surahs: false,
    surah: false,
    translation: false
  });
  
  const [error, setError] = useState({
    surahs: null,
    surah: null,
    translation: null
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedVerse, setHighlightedVerse] = useState(null);
  const [playingVerse, setPlayingVerse] = useState(null);
  
  const [bookmarks, setBookmarks] = useLocalStorage(STORAGE_KEYS.bookmarks, []);
  const [showTafsir, setShowTafsir] = useState(false);
  const [tafsirContent, setTafsirContent] = useState(null);

  // Load Surahs on component mount
  useEffect(() => {
    loadSurahs();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.target.tagName === 'INPUT') return;
      
      switch(event.key) {
        case KEYBOARD_SHORTCUTS.PLAY_PAUSE:
          event.preventDefault();
          if (window.audioPlayer) {
            window.audioPlayer.togglePlayPause();
          }
          break;
        case KEYBOARD_SHORTCUTS.PREVIOUS_VERSE:
          if (currentVerse > 0) {
            handleVersePlay(currentVerse - 1);
          }
          break;
        case KEYBOARD_SHORTCUTS.NEXT_VERSE:
          if (filteredArabicAyahs.length > 0 && currentVerse < filteredArabicAyahs.length - 1) {
            handleVersePlay(currentVerse + 1);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentVerse, surahData]);

  // Load all Surahs
  const loadSurahs = async () => {
    setLoading(prev => ({ ...prev, surahs: true }));
    setError(prev => ({ ...prev, surahs: null }));
    
    try {
      const surahsData = await QuranAPI.getSurahs();
      setSurahs(surahsData);
      showNotification('تم تحميل القرآن الكريم بنجاح', 'success');
    } catch (err) {
      setError(prev => ({ ...prev, surahs: 'فشل في تحميل قائمة السور' }));
      console.error('Error loading surahs:', err);
    } finally {
      setLoading(prev => ({ ...prev, surahs: false }));
    }
  };

  // Load specific Surah
  const loadSurah = useCallback(async (surahNumber) => {
    setCurrentSurah(surahNumber);
    setCurrentVerse(0);
    setLoading(prev => ({ ...prev, surah: true, translation: true }));
    setError(prev => ({ ...prev, surah: null, translation: null }));
    
    try {
      // Load Arabic text
      const arabicData = await QuranAPI.getSurah(surahNumber);
      setSurahData(arabicData);
      
      // Load translation
      await loadTranslation(surahNumber);
      
    } catch (err) {
      setError(prev => ({ ...prev, surah: 'فشل في تحميل السورة' }));
      console.error('Error loading surah:', err);
    } finally {
      setLoading(prev => ({ ...prev, surah: false }));
    }
  }, []);

  // Load translation
  const loadTranslation = useCallback(async (surahNumber = currentSurah) => {
    if (!surahNumber) return;
    
    setLoading(prev => ({ ...prev, translation: true }));
    setError(prev => ({ ...prev, translation: null }));
    
    try {
      const translationResponse = await QuranAPI.getTranslation(surahNumber, currentTranslation);
      setTranslationData(translationResponse);
    } catch (err) {
      setError(prev => ({ ...prev, translation: 'Error loading translation' }));
      console.error('Error loading translation:', err);
    } finally {
      setLoading(prev => ({ ...prev, translation: false }));
    }
  }, [currentSurah, currentTranslation]);

  // Handle Surah change
  const handleSurahChange = (surahNumber) => {
    loadSurah(surahNumber);
  };

  // Handle reciter change
  const handleReciterChange = (reciter) => {
    setCurrentReciter(reciter);
  };

  // Handle translation change
  const handleTranslationChange = (translation) => {
    setCurrentTranslation(translation);
    if (currentSurah) {
      loadTranslation(currentSurah);
    }
  };

  // Handle verse navigation from search or direct input
  const handleVerseNavigation = (surahNumber, verseNumber) => {
    if (currentSurah !== surahNumber) {
      loadSurah(surahNumber).then(() => {
        setTimeout(() => {
          scrollToVerse(verseNumber);
        }, 500);
      });
    } else {
      scrollToVerse(verseNumber);
    }
  };

  // Scroll to specific verse
  const scrollToVerse = (verseNumber) => {
    const verseElement = document.querySelector(`[data-verse-number="${verseNumber}"]`);
    if (verseElement) {
      verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedVerse(verseNumber);
      setTimeout(() => setHighlightedVerse(null), 3000);
    }
  };

  // Handle verse click/play
  const handleVersePlay = (verseIndex) => {
    setCurrentVerse(verseIndex);
    if (window.audioPlayer) {
      window.audioPlayer.playVerse(verseIndex);
    }
  };

  // Handle play state change
  const handlePlayStateChange = (playing) => {
    setIsPlaying(playing);
    if (playing) {
      setPlayingVerse(currentVerse);
    } else {
      setPlayingVerse(null);
    }
  };

  // Filter out Bismillah from verses (except for Surah Al-Fatiha where Bismillah is verse 1)
  const getFilteredAyahs = (ayahs, surahNumber) => {
    if (!ayahs) return [];
    
    // For Surah Al-Fatiha (1), keep all verses as they are
    // For Surah At-Tawbah (9), keep all verses as it doesn't start with Bismillah
    // For all other surahs, skip the first verse if it's Bismillah
    if (surahNumber === 1 || surahNumber === 9) {
      return ayahs;
    }
    
    // Check if first verse is Bismillah and filter it out
    const firstVerse = ayahs[0];
    if (firstVerse && firstVerse.text.trim().startsWith('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ')) {
      return ayahs.slice(1);
    }
    
    return ayahs;
  };

  const filteredArabicAyahs = surahData ? getFilteredAyahs(surahData.ayahs, currentSurah) : [];
  const filteredTranslationAyahs = translationData ? getFilteredAyahs(translationData.ayahs, currentSurah) : [];
  const handleVerseChange = (verseIndex) => {
    setCurrentVerse(verseIndex);
    setPlayingVerse(verseIndex);
    // Clear any previous highlights when a new verse starts playing
    setHighlightedVerse(null);
  };

  // Handle bookmark toggle
  const handleBookmarkToggle = (verseIndex, verse) => {
    if (!surahData) return;
    
    const bookmarkId = `${currentSurah}-${verse.numberInSurah}`;
    const existingIndex = bookmarks.findIndex(b => b.id === bookmarkId);
    
    if (existingIndex !== -1) {
      const newBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
      setBookmarks(newBookmarks);
      showNotification('تم حذف المرجعية', 'info');
    } else {
      const bookmark = {
        id: bookmarkId,
        surah: currentSurah,
        verse: verse.numberInSurah,
        arabicText: verse.text,
        translationText: getTranslationForVerse(verse.numberInSurah),
        timestamp: Date.now()
      };
      setBookmarks([...bookmarks, bookmark]);
      showNotification('تم حفظ المرجعية', 'success');
    }
  };

  // Check if verse is bookmarked
  const isBookmarked = (verseNumber) => {
    return bookmarks.some(b => b.id === `${currentSurah}-${verseNumber}`);
  };

  // Get translation text for a verse
  const getTranslationForVerse = (verseNumber) => {
    if (translationData && translationData.ayahs) {
      const ayah = translationData.ayahs.find(a => a.numberInSurah === verseNumber);
      return ayah ? ayah.text : '';
    }
    return '';
  };

  // Handle tafsir click
  const handleTafsirClick = (verseIndex) => {
    if (!surahData || !translationData) return;
    
    const ayah = surahData.ayahs[verseIndex];
    const tafsir = translationData.ayahs[verseIndex];
    
    setTafsirContent({
      verse: ayah.text,
      tafsir: tafsir.text,
      verseNumber: ayah.numberInSurah
    });
    setShowTafsir(true);
  };

  // Mouse hover handlers for verse highlighting
  const handleMouseEnter = (verseNumber) => {
    // Only highlight on hover if no verse is currently playing
    if (playingVerse === null) {
      setHighlightedVerse(verseNumber);
    }
  };

  const handleMouseLeave = (verseNumber) => {
    // Only remove hover highlight if no verse is currently playing
    if (playingVerse === null) {
      setHighlightedVerse(null);
    }
  };

  return (
    <div>
      <Controls
        surahs={surahs}
        onSurahChange={handleSurahChange}
        onReciterChange={handleReciterChange}
        onTranslationChange={handleTranslationChange}
        onVerseNavigation={handleVerseNavigation}
        currentReciter={currentReciter}
        currentTranslation={currentTranslation}
        showNotification={showNotification}
      />

      <div style={{ maxWidth: '1400px', margin: '0 auto', marginTop: '1rem' }}>
        <AudioPlayer
          currentSurah={currentSurah}
          currentVerse={currentVerse}
          currentReciter={currentReciter}
          surahData={surahData ? { ...surahData, ayahs: filteredArabicAyahs } : null}
          onVerseChange={handleVerseChange}
          onPlayStateChange={handlePlayStateChange}
          showNotification={showNotification}
        />
      </div>

      <main className="main-content">
        <SurahHeader surahData={surahData} />
        
        <div className="quran-column">
          <div className="column-header arabic-header">النص العربي</div>
          <div className="column-content">
            {loading.surah ? (
              <Loading message="جاري تحميل النص العربي..." />
            ) : error.surah ? (
              <ErrorComponent 
                message={error.surah} 
                onRetry={() => loadSurah(currentSurah)} 
              />
            ) : filteredArabicAyahs.length > 0 ? (
              filteredArabicAyahs.map((ayah, index) => (
                <div 
                  key={ayah.number}
                  onMouseEnter={() => handleMouseEnter(index + 1)}
                  onMouseLeave={() => handleMouseLeave(index + 1)}
                >
                  <VerseComponent
                    verse={ayah}
                    verseIndex={index}
                    isArabic={true}
                    isHighlighted={highlightedVerse === index + 1}
                    isPlaying={playingVerse === index}
                    isBookmarked={isBookmarked(ayah.numberInSurah)}
                    onVerseClick={handleVersePlay}
                    onBookmarkToggle={handleBookmarkToggle}
                    showBookmarkButton={true}
                  />
                </div>
              ))
            ) : (
              <Loading message="اختر سورة من القائمة أعلاه" />
            )}
          </div>
        </div>

        <div className="quran-column">
          <div className="column-header translation-header">
            {TRANSLATIONS[currentTranslation]}
          </div>
          <div className="column-content">
            {loading.translation ? (
              <Loading message="Loading translation..." />
            ) : error.translation ? (
              <ErrorComponent 
                message={error.translation} 
                onRetry={() => loadTranslation()} 
              />
            ) : filteredTranslationAyahs.length > 0 ? (
              filteredTranslationAyahs.map((ayah, index) => (
                <div 
                  key={index}
                  onMouseEnter={() => handleMouseEnter(index + 1)}
                  onMouseLeave={() => handleMouseLeave(index + 1)}
                >
                  <VerseComponent
                    verse={ayah}
                    verseIndex={index}
                    isArabic={false}
                    isUrdu={currentTranslation.includes('ur')}
                    isTafsir={currentTranslation === 'tafsir'}
                    isHighlighted={highlightedVerse === index + 1}
                    isPlaying={playingVerse === index}
                    onVerseClick={currentTranslation === 'tafsir' ? null : handleVersePlay}
                    onTafsirClick={currentTranslation === 'tafsir' ? handleTafsirClick : null}
                    showBookmarkButton={false}
                  />
                </div>
              ))
            ) : (
              <Loading message="اختر سورة من القائمة أعلاه" />
            )}
          </div>
        </div>
      </main>

      {/* Tafsir Panel */}
      {showTafsir && (
        <div className={`tafsir-panel ${showTafsir ? 'open' : ''}`}>
          <div className="tafsir-header">
            <h3>التفسير</h3>
            <button className="tafsir-close" onClick={() => setShowTafsir(false)}>
              ×
            </button>
          </div>
          <div className="tafsir-content">
            {tafsirContent && (
              <>
                <div className="tafsir-verse">{tafsirContent.verse}</div>
                <div className="tafsir-text">{tafsirContent.tafsir}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuranPage;