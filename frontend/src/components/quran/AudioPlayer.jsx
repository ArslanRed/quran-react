// AudioPlayer.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import QuranAPI from '../../services/quranApi';
import { RECITER_NAMES } from '../../utils/constants';

const AudioPlayer = ({
  currentSurah,
  currentVerse,        // 0-based index used by parent
  currentReciter,
  surahData,           // { ayahs: [...] } — each ayah should have numberInSurah (1-based)
  onVerseChange,       // (verseIndex, numberInSurah) => void  <-- new second param added
  onPlayStateChange,
  showNotification
}) => {
  const audioRef = useRef(null);
  const currentVerseRef = useRef(currentVerse);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // keep ref in sync (avoids stale closures inside event handlers)
  useEffect(() => { currentVerseRef.current = currentVerse; }, [currentVerse]);

  // Helper: safely get ayah by 0-based index
  const getAyah = (verseIndex) => {
    if (!surahData || !Array.isArray(surahData.ayahs)) return null;
    return surahData.ayahs[verseIndex] || null;
  };

  // Play specific verse (async to await audio.play if needed)
  const playVerse = useCallback(async (verseIndex) => {
    const ayah = getAyah(verseIndex);
    if (!ayah) return;

    const audioUrl = QuranAPI.getAudioUrl(currentSurah, ayah.numberInSurah, currentReciter);
    const audio = audioRef.current;
    if (!audio) return;

    // Immediately notify parent about verse change (both index and 1-based number)
    // Parent should use the numberInSurah to set the visual highlight.
    try {
      onVerseChange && onVerseChange(verseIndex, ayah.numberInSurah);
    } catch (err) {
      // swallow — parent may not expect 2 args; still fine
      try { onVerseChange && onVerseChange(verseIndex); } catch(e){/*no-op*/ }
    }

    // Set src and play
    setIsLoading(true);
    audio.src = audioUrl;
    try {
      await audio.play();
      // play() succeeded -> play event listener will set state
    } catch (err) {
      // Browsers can throw if autoplay blocked; propagate notification
      console.error('Audio play error:', err);
      showNotification && showNotification('خطأ في تشغيل الصوت', 'error');
      setIsLoading(false);
    }
  }, [currentSurah, currentReciter, onVerseChange, surahData, showNotification]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    // If a source already loaded, just play it. Otherwise play first verse.
    if (audio.src) {
      audio.play().catch(err => {
        console.error('Audio play error:', err);
        showNotification && showNotification('خطأ في تشغيل الصوت', 'error');
      });
    } else {
      // start at currentVerse (if exists) or 0
      const startIndex = typeof currentVerse === 'number' ? currentVerse : 0;
      playVerse(startIndex);
    }
  }, [isPlaying, currentVerse, playVerse, showNotification]);

  // Audio event handlers (attach once)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      showNotification && showNotification('جاري تحميل الصوت...', 'info');
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange && onPlayStateChange(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange && onPlayStateChange(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlayStateChange && onPlayStateChange(false);

      // Immediately advance to next verse (no timeout)
      const nextIndex = currentVerseRef.current + 1;
      if (surahData && surahData.ayahs && nextIndex < surahData.ayahs.length) {
        playVerse(nextIndex);
      } else {
        // reached end — clear src (optional)
        // audio.src = '';
      }
    };

    const handleTimeUpdate = () => {
      if (!audio.duration || isNaN(audio.duration)) return;
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      onPlayStateChange && onPlayStateChange(false);
      showNotification && showNotification('خطأ في تحميل الصوت', 'error');
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
    };
  }, [playVerse, onPlayStateChange, showNotification, surahData]);

  // Expose to window for keyboard shortcuts / external control
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.audioPlayer = {
        playVerse,
        togglePlayPause,
        isPlaying: () => isPlaying
      };
    }
    // cleanup
    return () => {
      if (typeof window !== 'undefined' && window.audioPlayer) {
        // don't fully delete (other code may rely) but remove our refs if needed
      }
    };
  }, [playVerse, togglePlayPause, isPlaying]);

  return (
    <div className="audio-controls">
      <button
        className="play-btn"
        onClick={togglePlayPause}
        disabled={isLoading}
      >
        {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
      </button>

      <div className="audio-info">
        <div className="reciter-name">
          {RECITER_NAMES[currentReciter] || ''}
        </div>

        <div className="audio-progress" aria-hidden>
          <div
            className="audio-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <audio ref={audioRef} preload="none" />
    </div>
  );
};

export default AudioPlayer;
