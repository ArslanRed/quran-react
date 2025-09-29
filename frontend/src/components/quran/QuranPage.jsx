import React, { useState, useEffect, useCallback, useRef } from 'react';
import Controls from './Controls';
import AudioPlayer from './AudioPlayer';
import VerseComponent from './VerseComponent';
import SurahHeader from './SurahHeader';
import { Loading, ErrorComponent } from '../common';
import { useLocalStorage } from '../../hooks';
import QuranAPI from '../../services/quranApi';

import { 
  DEFAULT_RECITER, 
  DEFAULT_TRANSLATION, 
  TRANSLATIONS,
  STORAGE_KEYS,
  KEYBOARD_SHORTCUTS 
} from '../../utils/constants';

const QuranPage = ({ showNotification, customTranslationData }) => {
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
  const [playingVerse, setPlayingVerse] = useState(null);
  const [highlightedVerse, setHighlightedVerse] = useState(null);
  const [bookmarks, setBookmarks] = useLocalStorage(STORAGE_KEYS.bookmarks, []);
  const [showTafsir, setShowTafsir] = useState(false);
  const [tafsirContent, setTafsirContent] = useState(null);

  // Refs for scrolling
  const contentAreaRef = useRef(null);

  // Initialize custom translation data
  useEffect(() => {
    if (customTranslationData) {
      QuranAPI.setCustomEnglishTranslation(customTranslationData);
    }
  }, []);

  // Load Surahs on component mount
  useEffect(() => {
    loadSurahs();
  }, []);

  // Perfect alignment function - ensures 1:1 mapping
const getAlignedAyahs = () => {
  if (!surahData || !translationData) return [];

  let arabicAyahs = [...(surahData.ayahs || [])];
  let translationAyahs = [...(translationData.ayahs || [])];

  // Only keep Bismillah for Al-Fatiha
  if (currentSurah !== 1) {
    arabicAyahs = arabicAyahs.map(ayah => {
      const bismillah = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ";
      if (ayah.text.startsWith(bismillah)) {
        return { ...ayah, text: ayah.text.replace(bismillah, '').trim() };
      }
      return ayah;
    });

    translationAyahs = translationAyahs.map(ayah => {
      const bismillahEng = /(in the name of allah|بسم الله)/i;
      if (ayah.text && bismillahEng.test(ayah.text)) {
        return { ...ayah, text: ayah.text.replace(bismillahEng, '').trim() };
      }
      return ayah;
    });
  }

  const aligned = arabicAyahs.map((arabicAyah) => {
    const matchingTranslation = translationAyahs.find(
      transAyah => transAyah?.numberInSurah === arabicAyah.numberInSurah
    );

    return {
      arabic: arabicAyah,
      translation: matchingTranslation || { text: '', numberInSurah: arabicAyah.numberInSurah },
      verseNumber: arabicAyah.numberInSurah,
      index: arabicAyah.numberInSurah - 1
    };
  });

  return aligned;
};


  const alignedAyahs = getAlignedAyahs();

  const handleVerseTogglePlay = (verseIndex) => {
    if (!window.audioPlayer) return;

    const currentlyPlaying = window.audioPlayer.isPlaying();

    if (playingVerse === verseIndex) {
      window.audioPlayer.togglePlayPause();
      setIsPlaying(!currentlyPlaying);
      if (currentlyPlaying) {
        setPlayingVerse(null);
        setHighlightedVerse(null);
      }
    } else {
      window.audioPlayer.playVerse(verseIndex);
      setPlayingVerse(verseIndex);
      setCurrentVerse(verseIndex);
      setIsPlaying(true);
      setHighlightedVerse(null);
    }
  };

  useEffect(() => {
    if (playingVerse !== null && alignedAyahs.length > 0) {
      setTimeout(() => {
        scrollToPlayingVerse(playingVerse);
      }, 300);
    }
  }, [playingVerse, alignedAyahs.length]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.target.tagName === 'INPUT') return;

      switch(event.key) {
        case KEYBOARD_SHORTCUTS.PLAY_PAUSE:
          event.preventDefault();
          handleVerseTogglePlay(currentVerse);
          break;
        case KEYBOARD_SHORTCUTS.PREVIOUS_VERSE:
          if (currentVerse > 0) {
            handleVerseTogglePlay(currentVerse - 1);
          }
          break;
        case KEYBOARD_SHORTCUTS.NEXT_VERSE:
          if (alignedAyahs.length > 0 && currentVerse < alignedAyahs.length - 1) {
            handleVerseTogglePlay(currentVerse + 1);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentVerse, alignedAyahs.length, playingVerse]);

  const scrollToPlayingVerse = (verseIndex) => {
    if (!alignedAyahs[verseIndex]) return;
    const verseNumber = alignedAyahs[verseIndex].verseNumber;
    const verseRow = document.querySelector(`[data-verse-row="${verseNumber}"]`);
    if (verseRow && contentAreaRef.current) {
      verseRow.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  };

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

  const loadSurah = useCallback(async (surahNumber) => {
    setCurrentSurah(surahNumber);
    setCurrentVerse(0);
    setPlayingVerse(null);
    setHighlightedVerse(null);
    setLoading(prev => ({ ...prev, surah: true, translation: true }));
    setError(prev => ({ ...prev, surah: null, translation: null }));
    try {
      const arabicData = await QuranAPI.getSurah(surahNumber);
      setSurahData(arabicData);
      await loadTranslation(surahNumber);
    } catch (err) {
      setError(prev => ({ ...prev, surah: 'فشل في تحميل السورة' }));
      console.error('Error loading surah:', err);
    } finally {
      setLoading(prev => ({ ...prev, surah: false }));
    }
  }, []);

  const loadTranslation = useCallback(async (surahNumber = currentSurah, translation = currentTranslation) => {
    if (!surahNumber) return;
    setLoading(prev => ({ ...prev, translation: true }));
    setError(prev => ({ ...prev, translation: null }));
    try {
      const translationResponse = await QuranAPI.getTranslation(surahNumber, translation);
      setTranslationData(translationResponse);
    } catch (err) {
      setError(prev => ({ ...prev, translation: 'Error loading translation' }));
      console.error('Error loading translation:', err);
    } finally {
      setLoading(prev => ({ ...prev, translation: false }));
    }
  }, [currentSurah, currentTranslation]);

  const handleSurahChange = (surahNumber) => {
    loadSurah(surahNumber);
  };

  const handleReciterChange = (reciter) => {
    setCurrentReciter(reciter);
  };

  const handleTranslationChange = (translation) => {
    setCurrentTranslation(translation);
    if (currentSurah) {
      loadTranslation(currentSurah, translation);
    }
  };

  const handleVerseNavigation = (surahNumber, verseNumber) => {
    if (currentSurah !== surahNumber) {
      loadSurah(surahNumber).then(() => {
        setTimeout(() => {
          scrollToVerse(verseNumber);
        }, 1000);
      });
    } else {
      scrollToVerse(verseNumber);
    }
  };

  const scrollToVerse = (verseNumber) => {
    const verseIndex = alignedAyahs.findIndex(pair => pair.verseNumber === verseNumber);
    if (verseIndex !== -1) {
      setHighlightedVerse(verseIndex);
      scrollToPlayingVerse(verseIndex);
      setTimeout(() => setHighlightedVerse(null), 3000);
    }
  };

  const handleVersePlay = (verseIndex) => {
    setCurrentVerse(verseIndex);
    setPlayingVerse(verseIndex);
    setHighlightedVerse(null);
    if (window.audioPlayer) {
      window.audioPlayer.playVerse(verseIndex);
    }
  };

  const handleVerseChange = (verseIndex) => {
    setCurrentVerse(verseIndex);
    setPlayingVerse(verseIndex);
    setHighlightedVerse(null);
  };

  const handlePlayStateChange = (playing) => {
    setIsPlaying(playing);
    if (!playing) {
      setPlayingVerse(null);
      setHighlightedVerse(null);
    }
  };

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

  const isBookmarked = (verseNumber) => {
    return bookmarks.some(b => b.id === `${currentSurah}-${verseNumber}`);
  };

  const getTranslationForVerse = (verseNumber) => {
    if (translationData && translationData.ayahs) {
      const ayah = translationData.ayahs.find(a => a.numberInSurah === verseNumber);
      return ayah ? ayah.text : '';
    }
    return '';
  };

  const handleTafsirClick = (verseIndex) => {
    if (!alignedAyahs[verseIndex]) return;
    const pair = alignedAyahs[verseIndex];
    setTafsirContent({
      verse: pair.arabic.text,
      tafsir: pair.translation.text || 'لا يوجد تفسير لهذه الآية',
      verseNumber: pair.verseNumber
    });
    setShowTafsir(true);
  };

  const handleMouseEnter = (verseIndex) => {
    if (playingVerse === null) {
      setHighlightedVerse(verseIndex);
    }
  };

  const handleMouseLeave = () => {
    if (playingVerse === null) {
      setHighlightedVerse(null);
    }
  };

  return (
    <div>
      {/* Google Translate Widget */}
      <div id="google_translate_element"></div>

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
          surahData={surahData ? { 
            ...surahData, 
            ayahs: alignedAyahs.map(pair => pair.arabic) 
          } : null}
          onVerseChange={handleVerseChange}
          onPlayStateChange={handlePlayStateChange}
          showNotification={showNotification}
        />
      </div>

      <main className="main-content">
        <SurahHeader surahData={surahData} />

        <div className="quran-column notranslate" style={{ gridColumn: '1 / -1' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 3px 1fr', 
            gap: '0',
            backgroundColor: 'white',
            borderRadius: '15px 15px 0 0',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e8e5e1',
            borderBottom: 'none'
          }}>
            <div style={{ 
              backgroundColor: 'var(--primary-green)',
              padding: '1.25rem',
              textAlign: 'center',
              color: 'beige',
              fontWeight: '600',
              fontSize: '1.1rem',
              borderRight: '1px solid #d4af37'
            }}>
              النص العربي
            </div>
            <div style={{ 
              background: 'linear-gradient(to bottom, #d4af37, #b8860b, #d4af37)',
              width: '3px'
            }}></div>
            <div style={{ 
              backgroundColor: 'var(--primary-green)',
              padding: '1.25rem',
              textAlign: 'center',
              color: 'beige',
              fontWeight: '600',
              fontSize: '1.1rem',
              borderLeft: '1px solid #d4af37'
            }}>
              {TRANSLATIONS[currentTranslation]}
            </div>
          </div>

          <div 
            ref={contentAreaRef}
            className="column-content"
            style={{
              backgroundColor: 'white',
              borderRadius: '0 0 15px 15px',
              border: '1px solid var(--border-light)',
              borderTop: 'none'
            }}
          >
            {loading.surah || loading.translation ? (
              <Loading message="جاري تحميل المحتوى..." />
            ) : error.surah || error.translation ? (
              <ErrorComponent message={error.surah || error.translation} onRetry={() => loadSurah(currentSurah)} />
            ) : alignedAyahs.length > 0 ? (
              alignedAyahs.map((pair, index) => (
                <div 
                  key={`verse-row-${pair.verseNumber}`}
                  data-verse-row={pair.verseNumber}
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseLeave={handleMouseLeave}
                  style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr 3px 1fr',
                    gap: '0',
                    marginBottom: '1rem',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #e8e5e1'
                  }}
                >
                  <div style={{ 
                    backgroundColor: '#f7f5f3',
                    padding: '1.5rem',
                    borderRight: '1px solid #d4af37'
                  }}>
                    <VerseComponent
                      verse={pair.arabic}
                      verseIndex={index}
                      isArabic={true}
                      isHighlighted={highlightedVerse === index && playingVerse === null}
                      isPlaying={playingVerse === index}
                      isBookmarked={isBookmarked(pair.verseNumber)}
                      currentVerse={currentVerse}             
                      totalVerses={alignedAyahs.length} 
                      onBookmarkToggle={handleBookmarkToggle}
                      showBookmarkButton={true}
                      onVerseClick={handleVerseTogglePlay}
                    />
                  </div>

                  <div style={{ 
                    background: 'linear-gradient(to bottom, #d4af37, #b8860b, #d4af37)',
                    width: '3px'
                  }}></div>

                  <div style={{ 
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderLeft: '1px solid #d4af37'
                  }}>
                    <VerseComponent
                      verse={pair.translation}
                      verseIndex={index}
                      isArabic={false}
                      isUrdu={currentTranslation.includes('ur')}
                      isTafsir={currentTranslation === 'tafsir'}
                      isHighlighted={highlightedVerse === index && playingVerse === null}
                      isPlaying={playingVerse === index}
                      onVerseClick={currentTranslation === 'tafsir' ? null : handleVersePlay}
                      onTafsirClick={currentTranslation === 'tafsir' ? handleTafsirClick : null}
                      showBookmarkButton={false}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--primary-green)', fontSize: '1.1rem' }}>
                اختر سورة من القائمة أعلاه
              </div>
            )}
          </div>
        </div>
      </main>

      {showTafsir && (
        <div className={`tafsir-panel ${showTafsir ? 'open' : ''}`}>
          <div className="tafsir-header">
            <h3>التفسير</h3>
            <button className="tafsir-close" onClick={() => setShowTafsir(false)}>×</button>
          </div>
          <div className="tafsir-content">
            {tafsirContent && (
              <>
                <div className="tafsir-verse notranslate">{tafsirContent.verse}</div>
                <div className="tafsir-text notranslate">{tafsirContent.tafsir}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuranPage;
