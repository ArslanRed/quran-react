// services/adminApi.js - Frontend API service for Admin Panel
class AdminAPIService {
  constructor() {
    this.baseURL = process.env.REACT_APP_ADMIN_API_URL || 'http://localhost:3001/api';
    this.token = localStorage.getItem('adminToken');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('adminToken', token);
    } else {
      localStorage.removeItem('adminToken');
    }
  }

  // Get authentication headers
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication methods
  async login(username, password) {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (response.success && response.token) {
        this.setToken(response.token);
        return response;
      }

      throw new Error('Login failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setToken(null);
    }
  }

  // Surah management methods
  async getSurahs() {
    try {
      const response = await this.request('/surahs');
      return response.data;
    } catch (error) {
      console.error('Error fetching surahs:', error);
      throw error;
    }
  }

  async getSurah(surahNumber) {
    try {
      const response = await this.request(`/surah/${surahNumber}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching surah ${surahNumber}:`, error);
      throw error;
    }
  }

  // Translation management methods
  async getTranslation(surahNumber, translationId) {
    try {
      const response = await this.request(`/translation/${surahNumber}/${translationId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching translation ${translationId} for surah ${surahNumber}:`, error);
      throw error;
    }
  }

  async updateVerseTranslation(surahNumber, verseNumber, translationId, newText) {
    try {
      const response = await this.request(`/translation/${surahNumber}/${verseNumber}/${translationId}`, {
        method: 'PUT',
        body: JSON.stringify({ text: newText }),
      });
      return response;
    } catch (error) {
      console.error('Error updating translation:', error);
      throw error;
    }
  }

  // Audio management methods
  async uploadAudio(surahNumber, verseNumber, audioFile, progressCallback) {
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('surah', surahNumber.toString());
      formData.append('verse', verseNumber.toString());

      const response = await fetch(`${this.baseURL}/audio/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } catch (error) {
      console.error('Audio upload error:', error);
      throw error;
    }
  }

  async deleteAudio(surahNumber, verseNumber) {
    try {
      const response = await this.request(`/audio/${surahNumber}/${verseNumber}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Error deleting audio:', error);
      throw error;
    }
  }

  async bulkUploadAudio(surahNumber, audioFiles, progressCallback) {
    try {
      const formData = new FormData();
      formData.append('surahNumber', surahNumber.toString());
      
      audioFiles.forEach((file, index) => {
        formData.append('audioFiles', file);
      });

      const response = await fetch(`${this.baseURL}/audio/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk upload failed');
      }

      return data;
    } catch (error) {
      console.error('Bulk upload error:', error);
      throw error;
    }
  }

  async getAudioStatus(surahNumber) {
    try {
      const response = await this.request(`/audio-status/${surahNumber}`);
      return response.data;
    } catch (error) {
      console.error('Error getting audio status:', error);
      throw error;
    }
  }

  // Search methods
  async searchTranslations(query) {
    try {
      const response = await this.request(`/search/translations/${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Utility methods
  isAuthenticated() {
    return !!this.token;
  }

  // File validation helpers
  validateAudioFile(file) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['audio/mpeg', 'audio/mp3'];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only MP3 files are allowed');
    }

    if (file.size > maxSize) {
      throw new Error('File size must be less than 50MB');
    }

    return true;
  }

  validateBulkAudioFiles(files) {
    const errors = [];
    
    files.forEach((file, index) => {
      try {
        this.validateAudioFile(file);
        
        // Check filename format (should be like 001.mp3, 002.mp3, etc.)
        if (!/^\d{3}\.mp3$/i.test(file.name)) {
          errors.push(`File ${index + 1} (${file.name}): Invalid filename format. Use 001.mp3, 002.mp3, etc.`);
        }
      } catch (error) {
        errors.push(`File ${index + 1} (${file.name}): ${error.message}`);
      }
    });

    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    return true;
  }

  // Progress tracking for uploads
  createProgressTracker() {
    return {
      total: 0,
      completed: 0,
      failed: 0,
      progress: 0,
      
      updateProgress() {
        this.progress = this.total > 0 ? (this.completed + this.failed) / this.total * 100 : 0;
      },
      
      addCompleted() {
        this.completed++;
        this.updateProgress();
      },
      
      addFailed() {
        this.failed++;
        this.updateProgress();
      },
      
      setTotal(total) {
        this.total = total;
        this.updateProgress();
      }
    };
  }
}

// Create singleton instance
const adminAPI = new AdminAPIService();

export default adminAPI;

// Additional utility functions
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const validateVerseReference = (reference) => {
  const match = reference.match(/^(\d+):(\d+)$/);
  if (match) {
    const surahNumber = parseInt(match[1]);
    const verseNumber = parseInt(match[2]);
    
    if (surahNumber >= 1 && surahNumber <= 114 && verseNumber >= 1) {
      return { surahNumber, verseNumber };
    }
  }
  return null;
};