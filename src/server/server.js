// server.js - Express.js Backend for Quran Admin Panel
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Static files for audio
app.use('/audio', express.static('public/audio'));

// Multer configuration for file uploads
const audioStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const surahNumber = req.body.surah;
    const dir = `public/audio/${surahNumber.padStart(3, '0')}`;
    fs.mkdir(dir, { recursive: true }).then(() => {
      cb(null, dir);
    });
  },
  filename: function (req, file, cb) {
    const surahNumber = req.body.surah.padStart(3, '0');
    const verseNumber = req.body.verse.padStart(3, '0');
    cb(null, `${surahNumber}${verseNumber}.mp3`);
  }
});

const upload = multer({
  storage: audioStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg') {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 files are allowed!'), false);
    }
  }
});

// Database simulation (replace with actual database)
class DatabaseManager {
  constructor() {
    this.dataPath = './data';
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      await fs.mkdir(`${this.dataPath}/translations`, { recursive: true });
      await fs.mkdir(`${this.dataPath}/surahs`, { recursive: true });
      await fs.mkdir('public/audio', { recursive: true });
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  async getSurahs() {
    try {
      const data = await fs.readFile(`${this.dataPath}/surahs.json`, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Return default surahs if file doesn't exist
      return this.getDefaultSurahs();
    }
  }

  getDefaultSurahs() {
    return [
      { number: 1, name: 'الفاتحة', englishName: 'Al-Fatihah', numberOfAyahs: 7 },
      { number: 2, name: 'البقرة', englishName: 'Al-Baqarah', numberOfAyahs: 286 },
      { number: 3, name: 'آل عمران', englishName: 'Ali Imran', numberOfAyahs: 200 },
      { number: 4, name: 'النساء', englishName: 'An-Nisa', numberOfAyahs: 176 },
      { number: 5, name: 'المائدة', englishName: 'Al-Maidah', numberOfAyahs: 120 }
      // Add all 114 surahs...
    ];
  }

  async getSurah(surahNumber) {
    try {
      const data = await fs.readFile(`${this.dataPath}/surahs/${surahNumber}.json`, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Surah ${surahNumber} not found`);
    }
  }

  async saveSurah(surahNumber, surahData) {
    try {
      await fs.writeFile(
        `${this.dataPath}/surahs/${surahNumber}.json`,
        JSON.stringify(surahData, null, 2),
        'utf8'
      );
      return true;
    } catch (error) {
      throw new Error('Failed to save surah data');
    }
  }

  async getTranslation(surahNumber, translationId) {
    try {
      const data = await fs.readFile(
        `${this.dataPath}/translations/${translationId}_${surahNumber}.json`,
        'utf8'
      );
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Translation ${translationId} for surah ${surahNumber} not found`);
    }
  }

  async saveTranslation(surahNumber, translationId, translationData) {
    try {
      await fs.writeFile(
        `${this.dataPath}/translations/${translationId}_${surahNumber}.json`,
        JSON.stringify(translationData, null, 2),
        'utf8'
      );
      return true;
    } catch (error) {
      throw new Error('Failed to save translation data');
    }
  }

  async updateVerseTranslation(surahNumber, verseNumber, translationId, newText) {
    try {
      const translationData = await this.getTranslation(surahNumber, translationId);
      
      const verseIndex = translationData.ayahs.findIndex(
        ayah => ayah.numberInSurah === parseInt(verseNumber)
      );
      
      if (verseIndex !== -1) {
        translationData.ayahs[verseIndex].text = newText;
        await this.saveTranslation(surahNumber, translationId, translationData);
        return true;
      }
      
      throw new Error('Verse not found');
    } catch (error) {
      throw new Error('Failed to update verse translation');
    }
  }

  async checkAudioExists(surahNumber, verseNumber) {
    const fileName = `${surahNumber.toString().padStart(3, '0')}${verseNumber.toString().padStart(3, '0')}.mp3`;
    const filePath = `public/audio/${surahNumber.toString().padStart(3, '0')}/${fileName}`;
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

const db = new DatabaseManager();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // In production, validate against database with hashed passwords
    if (username === 'admin' && password === 'admin123') {
      const token = jwt.sign(
        { username, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: { username, role: 'admin' }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Surah Management Routes
app.get('/api/surahs', authenticateToken, async (req, res) => {
  try {
    const surahs = await db.getSurahs();
    res.json({ success: true, data: surahs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch surahs' });
  }
});

app.get('/api/surah/:number', authenticateToken, async (req, res) => {
  try {
    const surahNumber = parseInt(req.params.number);
    const surahData = await db.getSurah(surahNumber);
    
    // Check audio availability for each verse
    for (let ayah of surahData.ayahs) {
      ayah.hasAudio = await db.checkAudioExists(surahNumber, ayah.numberInSurah);
    }
    
    res.json({ success: true, data: surahData });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Translation Management Routes
app.get('/api/translation/:surahNumber/:translationId', authenticateToken, async (req, res) => {
  try {
    const { surahNumber, translationId } = req.params;
    const translationData = await db.getTranslation(surahNumber, translationId);
    res.json({ success: true, data: translationData });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.put('/api/translation/:surahNumber/:verseNumber/:translationId', authenticateToken, async (req, res) => {
  try {
    const { surahNumber, verseNumber, translationId } = req.params;
    const { text } = req.body;
    
    await db.updateVerseTranslation(surahNumber, verseNumber, translationId, text);
    
    res.json({ success: true, message: 'Translation updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Audio Management Routes
app.post('/api/audio/upload', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { surah, verse } = req.body;
    
    // Log the upload
    console.log(`Audio uploaded: Surah ${surah}, Verse ${verse}, File: ${req.file.filename}`);
    
    res.json({
      success: true,
      message: 'Audio uploaded successfully',
      file: {
        surah: parseInt(surah),
        verse: parseInt(verse),
        filename: req.file.filename,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({ error: 'Failed to upload audio file' });
  }
});

app.delete('/api/audio/:surahNumber/:verseNumber', authenticateToken, async (req, res) => {
  try {
    const { surahNumber, verseNumber } = req.params;
    const fileName = `${surahNumber.padStart(3, '0')}${verseNumber.padStart(3, '0')}.mp3`;
    const filePath = `public/audio/${surahNumber.padStart(3, '0')}/${fileName}`;
    
    await fs.unlink(filePath);
    
    res.json({ success: true, message: 'Audio file deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete audio file' });
  }
});

// Bulk Audio Upload Route
app.post('/api/audio/bulk-upload', authenticateToken, upload.array('audioFiles', 50), async (req, res) => {
  try {
    const { surahNumber } = req.body;
    const uploadedFiles = req.files;
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No audio files provided' });
    }

    const results = [];
    
    for (const file of uploadedFiles) {
      // Extract verse number from filename (assuming format: 001.mp3, 002.mp3, etc.)
      const verseMatch = file.originalname.match(/(\d+)\.mp3$/);
      if (verseMatch) {
        const verseNumber = parseInt(verseMatch[1]);
        
        // Move file to correct location
        const newFileName = `${surahNumber.padStart(3, '0')}${verseNumber.toString().padStart(3, '0')}.mp3`;
        const newPath = `public/audio/${surahNumber.padStart(3, '0')}/${newFileName}`;
        
        await fs.rename(file.path, newPath);
        
        results.push({
          verse: verseNumber,
          filename: newFileName,
          status: 'success'
        });
      } else {
        results.push({
          filename: file.originalname,
          status: 'error',
          message: 'Invalid filename format'
        });
      }
    }
    
    res.json({
      success: true,
      message: `Bulk upload completed for Surah ${surahNumber}`,
      results
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Bulk upload failed' });
  }
});

// Audio Status Check Route
app.get('/api/audio-status/:surahNumber', authenticateToken, async (req, res) => {
  try {
    const surahNumber = req.params.surahNumber;
    const surahData = await db.getSurah(surahNumber);
    
    const audioStatus = [];
    
    for (const ayah of surahData.ayahs) {
      const hasAudio = await db.checkAudioExists(surahNumber, ayah.numberInSurah);
      audioStatus.push({
        verse: ayah.numberInSurah,
        hasAudio
      });
    }
    
    res.json({ success: true, data: audioStatus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check audio status' });
  }
});

// Search Routes
app.get('/api/search/translations/:query', authenticateToken, async (req, res) => {
  try {
    const query = req.params.query.toLowerCase();
    const results = [];
    
    // Search through all translations (simplified version)
    // In production, implement proper search indexing
    
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error Handling Middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Quran Admin Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;