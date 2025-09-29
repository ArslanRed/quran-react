// API URLs
export const API_BASE = 'https://api.alquran.cloud/v1';
export const AUDIO_BASE = 'https://everyayah.com/data';

// Reciter mappings for audio
export const RECITER_MAPPINGS = {
  'ar.alafasy': 'Alafasy_128kbps',
  'ar.abdurrahmaansudais': 'AbdurRahman_As-Sudais_192kbps',
  'ar.mahermuaiqly': 'Maher_Al_Muaiqly_128kbps',
  'ar.saadalghamdi': 'Saad_Al-Ghamadi_64kbps',
  'ar.abdulbasitmurattal': 'Abdul_Basit_Murattal_192kbps'
};

// Reciter names in Arabic
export const RECITER_NAMES = {
  'ar.alafasy': 'مشاري العفاسي',
  'ar.abdurrahmaansudais': 'عبد الرحمن السديس',
  'ar.mahermuaiqly': 'ماهر المعيقلي',
  'ar.saadalghamdi': 'سعد الغامدي',
  'ar.abdulbasitmurattal': 'عبد الباسط مرتل'
};

// Translation options
export const TRANSLATIONS = {
  'en.custom': 'English (Custom)',
  'ur.jalandhry': 'اردو ترجمہ',
  'tafsir': 'التفسير'
};

// Default reciter
export const DEFAULT_RECITER = 'ar.alafasy';

// Default translation
export const DEFAULT_TRANSLATION = 'en.custom';

// CSS classes
export const CSS_CLASSES = {
  verse: {
    container: 'verse-container',
    number: 'verse-number',
    text: 'verse-text',
    highlighted: 'highlighted',
    playing: 'playing',
    bookmarked: 'bookmarked'
  },
  loading: 'loading',
  error: 'error',
  spinner: 'spinner'
};

// Local storage keys
export const STORAGE_KEYS = {
  bookmarks: 'quranBookmarks'
};

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  PLAY_PAUSE: ' ',
  PREVIOUS_VERSE: 'ArrowRight',
  NEXT_VERSE: 'ArrowLeft'
};