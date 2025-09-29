const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const uploadConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
  audioPath: 'public/audio',
  tempPath: 'temp/uploads'
};

// Ensure directories exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir(uploadConfig.audioPath, { recursive: true });
    await fs.mkdir(uploadConfig.tempPath, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
};

ensureDirectories();

// Audio storage configuration
const audioStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const surahNumber = req.body.surah;
    const dir = path.join(uploadConfig.audioPath, surahNumber.padStart(3, '0'));
    
    try {
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const surahNumber = req.body.surah.padStart(3, '0');
    const verseNumber = req.body.verse.padStart(3, '0');
    const timestamp = Date.now();
    cb(null, `${surahNumber}${verseNumber}_${timestamp}.mp3`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only MP3 files are allowed'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: audioStorage,
  limits: {
    fileSize: uploadConfig.maxFileSize
  },
  fileFilter: fileFilter
});

module.exports = {
  uploadConfig,
  upload,
  ensureDirectories
};