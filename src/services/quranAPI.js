import { API_BASE, AUDIO_BASE, RECITER_MAPPINGS } from '../utils/constants';

class QuranAPI {
  // Fetch all Surahs
  static async getSurahs() {
    try {
      const response = await fetch(`${API_BASE}/surah`);
      const data = await response.json();
      
      if (data.code === 200) {
        return data.data;
      }
      throw new Error('Failed to load surahs');
    } catch (error) {
      console.error('Error fetching surahs:', error);
      throw error;
    }
  }

  // Fetch specific Surah (Arabic text)
  static async getSurah(surahNumber) {
    try {
      const response = await fetch(`${API_BASE}/surah/${surahNumber}`);
      const data = await response.json();
      
      if (data.code === 200) {
        return data.data;
      }
      throw new Error('Failed to load surah');
    } catch (error) {
      console.error('Error fetching surah:', error);
      throw error;
    }
  }

  // Fetch translation for a specific Surah
  static async getTranslation(surahNumber, translationId) {
    try {
      let translationUrl;
      
      if (translationId === 'tafsir') {
        // Load tafsir from Quran.com API
        translationUrl = `https://api.quran.com/api/v4/quran/tafsirs/168?chapter_number=${surahNumber}`;
      } else {
        translationUrl = `${API_BASE}/surah/${surahNumber}/${translationId}`;
      }
      
      const response = await fetch(translationUrl);
      const data = await response.json();
      
      if (translationId === 'tafsir') {
        if (data.tafsirs) {
          return { ayahs: data.tafsirs };
        }
        throw new Error('Failed to load tafsir');
      } else {
        if (data.code === 200) {
          return data.data;
        }
        throw new Error('Failed to load translation');
      }
    } catch (error) {
      console.error('Error fetching translation:', error);
      throw error;
    }
  }

  // Search in Quran
  static async searchQuran(query) {
    try {
      if (query.length < 2) {
        return { matches: [] };
      }

      const response = await fetch(`${API_BASE}/search/${encodeURIComponent(query)}/all/ar`);
      const data = await response.json();
      
      if (data.code === 200) {
        return data.data;
      }
      throw new Error('Search failed');
    } catch (error) {
      console.error('Error searching Quran:', error);
      throw error;
    }
  }

  // Get audio URL for a specific verse
  static getAudioUrl(surahNumber, verseNumber, reciterId) {
    const paddedSurah = surahNumber.toString().padStart(3, '0');
    const paddedVerse = verseNumber.toString().padStart(3, '0');
    const reciterFolder = RECITER_MAPPINGS[reciterId];
    return `${AUDIO_BASE}/${reciterFolder}/${paddedSurah}${paddedVerse}.mp3`;
  }

  // Validate verse reference (surah:verse format)
  static parseVerseReference(reference) {
    const match = reference.match(/^(\d+):(\d+)$/);
    if (match) {
      const surahNumber = parseInt(match[1]);
      const verseNumber = parseInt(match[2]);
      
      if (surahNumber >= 1 && surahNumber <= 114 && verseNumber >= 1) {
        return { surahNumber, verseNumber };
      }
    }
    return null;
  }
}

export default QuranAPI;