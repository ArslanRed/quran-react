import React, { useRef, useEffect, useState } from 'react';
import QuranAPI from '../../services/quranAPI';
import { RECITER_NAMES } from '../../utils/constants';

const AudioPlayer = ({ 
  currentSurah,
  currentVerse,
  currentReciter,
  surahData,
  onVerseChange,
  onPlayStateChange,
  showNotification 
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Play specific verse
  const playVerse = (verseIndex) => {
    if (!surahData || !surahData.ayahs || !surahData.ayahs[verseIndex]) return;
    
    const ayah = surahData.ayahs[verseIndex];
    const audioUrl = QuranAPI.getAudioUrl(currentSurah, ayah.numberInSurah, currentReciter);
    
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(error => {
        console.error('Audio play error:', error);
        showNotification('خطأ في تشغيل الصوت', 'error');
      });
    }
    
    onVerseChange(verseIndex);
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (audioRef.current.src) {
        audioRef.current.play().catch(error => {
          console.error('Audio play error:', error);
          showNotification('خطأ في تشغيل الصوت', 'error');
        });
      } else if (surahData && surahData.ayahs && surahData.ayahs.length > 0) {
        playVerse(0);
      }
    }
  };

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      showNotification('جاري تحميل الصوت...', 'info');
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlayStateChange(false);
      
      // Auto-play next verse
      if (surahData && surahData.ayahs && currentVerse < surahData.ayahs.length - 1) {
        setTimeout(() => {
          const nextVerseIndex = currentVerse + 1;
          playVerse(nextVerseIndex);
        }, 1000);
      }
    };

    const handleTimeUpdate = () => {
      if (audio.duration) {
        const progressPercent = (audio.currentTime / audio.duration) * 100;
        setProgress(progressPercent);
      }
    };

    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      onPlayStateChange(false);
      showNotification('خطأ في تحميل الصوت', 'error');
    };

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);

    // Cleanup
    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
    };
  }, [currentVerse, surahData, onPlayStateChange, showNotification]);

  // Expose methods to parent
  useEffect(() => {
    // This allows parent components to trigger audio playback
    if (window) {
      window.audioPlayer = {
        playVerse,
        togglePlayPause,
        isPlaying
      };
    }
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
          {RECITER_NAMES[currentReciter]}
        </div>
        <div className="audio-progress">
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