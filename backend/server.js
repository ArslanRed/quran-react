require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

// Import SQLite DB
const db = require('./config/db');
const { verifyToken, generateToken, hashPassword, comparePassword } = require('./config/database');
const { upload } = require('./config/upload');

// Import services/models
const UserService = require('./services/UserService');
const SurahService = require('./services/SurahService');
const TranslationService = require('./services/TranslationService');
const AudioService = require('./services/AudioService');
const ActivityService = require('./services/ActivityService');

const app = express();
const PORT = process.env.PORT || 3001;

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'quran-admin-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'"],
    },
  },
}));

app.use(compression());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

// Request logging middleware
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip });
  next();
});

// Static files for audio
app.use('/audio', express.static('public/audio', { maxAge: '1y', etag: true, lastModified: true }));

// Initialize services
const userService = new UserService(db, logger);
const surahService = new SurahService(db, logger);
const translationService = new TranslationService(db, logger);
const audioService = new AudioService(db, logger);
const activityService = new ActivityService(db, logger);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access token required' });

    const decoded = verifyToken(token);
    const user = userService.findById(decoded.id);

    if (!user || !user.is_active) return res.status(403).json({ error: 'User not found or inactive' });

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Authorization middleware
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
};

// Activity logging middleware
const logActivity = (action) => {
  return (req, res, next) => {
    try {
      req.activityAction = action;
      res.on('finish', () => {
        if (req.user && res.statusCode < 400) {
          activityService.log({
            userId: req.user.id,
            action,
            entityType: req.params.entityType,
            entityId: req.params.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            newValues: req.body,
          }).catch(err => logger.error('Activity log error:', err));
        }
      });
      next();
    } catch (error) {
      logger.error('Activity logging error:', error);
      next();
    }
  };
};

// ===================== Authentication Routes =====================
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    const user = userService.findByUsername(username);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });

    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) return res.status(401).json({ error: 'Invalid credentials' });

    userService.updateLastLogin(user.id);

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    logger.info(`User ${username} logged in successfully`, { userId: user.id });

    res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// ===================== User Management Routes =====================
app.get('/api/users', authenticateToken, authorize(['admin']), (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const users = userService.getAll(page, limit, search);
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', authenticateToken, authorize(['admin']), logActivity('create_user'), async (req, res) => {
  try {
    const { username, email, password, role = 'editor' } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const hashedPassword = await hashPassword(password);
    const userId = userService.create({
      username,
      email,
      password_hash: hashedPassword,
      role
    });

    res.json({ success: true, data: { id: userId } });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ===================== Surah Management Routes =====================
app.get('/api/surahs', authenticateToken, async (req, res) => {
  try {
    const surahs = await surahService.getAll();
    res.json({ success: true, data: surahs });
  } catch (error) {
    logger.error('Get surahs error:', error);
    res.status(500).json({ error: 'Failed to fetch surahs' });
  }
});

app.get('/api/surah/:number', authenticateToken, async (req, res) => {
  try {
    const surahNumber = parseInt(req.params.number);
    
    if (surahNumber < 1 || surahNumber > 114) {
      return res.status(400).json({ error: 'Invalid surah number' });
    }

    const surahData = await surahService.getSurahWithAyahs(surahNumber);
    if (!surahData) {
      return res.status(404).json({ error: 'Surah not found' });
    }

    res.json({ success: true, data: surahData });
  } catch (error) {
    logger.error('Get surah error:', error);
    res.status(500).json({ error: 'Failed to fetch surah' });
  }
});

// ===================== Translation Management Routes =====================
app.get('/api/translations/sources', authenticateToken, (req, res) => {
  try {
    const sources = translationService.getSources();
    res.json({ success: true, data: sources });
  } catch (error) {
    logger.error('Get translation sources error:', error);
    res.status(500).json({ error: 'Failed to fetch translation sources' });
  }
});

app.get('/api/translation/:surahNumber/:sourceId', authenticateToken, (req, res) => {
  try {
    const { surahNumber, sourceId } = req.params;
    const translations = translationService.getBySurahAndSource(surahNumber, sourceId);
    res.json({ success: true, data: translations });
  } catch (error) {
    logger.error('Get translation error:', error);
    res.status(404).json({ error: 'Translation not found' });
  }
});

app.put('/api/translation/:ayahId/:sourceId', 
  authenticateToken, 
  authorize(['admin', 'editor']), 
  logActivity('update_translation'), 
  (req, res) => {
    try {
      const { ayahId, sourceId } = req.params;
      const { text, footnotes } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Translation text is required' });
      }

      translationService.updateTranslation(ayahId, sourceId, {
        text,
        footnotes,
        is_approved: req.user.role === 'admin'
      });
      
      res.json({ success: true, message: 'Translation updated successfully' });
    } catch (error) {
      logger.error('Update translation error:', error);
      res.status(500).json({ error: 'Failed to update translation' });
    }
  }
);

// ===================== Audio Management Routes =====================
app.get('/api/reciters', authenticateToken, (req, res) => {
  try {
    const reciters = audioService.getReciters();
    res.json({ success: true, data: reciters });
  } catch (error) {
    logger.error('Get reciters error:', error);
    res.status(500).json({ error: 'Failed to fetch reciters' });
  }
});

app.post('/api/audio/upload', 
  authenticateToken, 
  authorize(['admin', 'editor']),
  upload.single('audio'), 
  logActivity('upload_audio'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const { surahNumber, verseNumber, reciterId = 1 } = req.body;
      
      if (!surahNumber || !verseNumber) {
        return res.status(400).json({ error: 'Surah and verse numbers are required' });
      }

      // Get or create ayah record
      let ayah = surahService.getAyahBySurahAndVerse(surahNumber, verseNumber);
      
      if (!ayah) {
        return res.status(404).json({ error: 'Failed to create verse record' });
      }

      // Save audio file info to database
      const audioId = audioService.create({
        ayah_id: ayah.id,
        reciter_id: reciterId,
        file_path: req.file.path,
        file_name: req.file.filename,
        file_size: req.file.size,
        format: 'mp3',
        uploaded_by: req.user.id
      });
      
      logger.info(`Audio uploaded for Surah ${surahNumber}, Verse ${verseNumber}`, {
        userId: req.user.id,
        audioId,
        filename: req.file.filename
      });

      res.json({
        success: true,
        message: 'Audio uploaded successfully',
        data: {
          id: audioId,
          surahNumber: parseInt(surahNumber),
          verseNumber: parseInt(verseNumber),
          filename: req.file.filename,
          size: req.file.size
        }
      });
    } catch (error) {
      logger.error('Audio upload error:', error);
      res.status(500).json({ error: 'Failed to upload audio file' });
    }
  }
);

app.delete('/api/audio/:audioId', 
  authenticateToken, 
  authorize(['admin', 'editor']),
  logActivity('delete_audio'),
  async (req, res) => {
    try {
      const audioId = parseInt(req.params.audioId);
      const deleted = await audioService.delete(audioId);
      
      if (deleted) {
        res.json({ success: true, message: 'Audio file deleted successfully' });
      } else {
        res.status(404).json({ error: 'Audio file not found' });
      }
    } catch (error) {
      logger.error('Delete audio error:', error);
      res.status(500).json({ error: 'Failed to delete audio file' });
    }
  }
);

app.get('/api/audio-status/:surahNumber', authenticateToken, (req, res) => {
  try {
    const surahNumber = parseInt(req.params.surahNumber);
    const audioStatus = audioService.getSurahAudioStatus(surahNumber);
    res.json({ success: true, data: audioStatus });
  } catch (error) {
    logger.error('Get audio status error:', error);
    res.status(500).json({ error: 'Failed to get audio status' });
  }
});

// ===================== Search Routes =====================
app.get('/api/search/translations/:query', authenticateToken, (req, res) => {
  try {
    const query = req.params.query;
    const { sourceId, limit = 50 } = req.query;
    
    if (query.length < 3) {
      return res.status(400).json({ error: 'Search query must be at least 3 characters long' });
    }

    const results = translationService.search(query, sourceId, limit);
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Translation search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ===================== Analytics & Reports Routes =====================
app.get('/api/analytics/dashboard', authenticateToken, (req, res) => {
  try {
    const stats = {
      surahs: surahService.getStats(),
      translations: translationService.getStats(),
      audio: audioService.getStats(),
      users: userService.getStats()
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.get('/api/activity-logs', authenticateToken, authorize(['admin']), (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action } = req.query;
    const logs = activityService.getAll(page, limit, { userId, action });
    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  try {
    const row = db.prepare('SELECT 1 as test').get();
    const dbHealthy = row && row.test === 1;
    
    res.json({
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
      database: dbHealthy ? 'connected' : 'disconnected'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      timestamp: new Date().toISOString(), 
      error: 'Database connection failed' 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', { error: error.message, stack: error.stack });
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    if (error.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'Too many files. Maximum is 50 files.' });
  }
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
});

// 404 handler
app.use((req, res) => { 
  res.status(404).json({ error: 'Route not found' }); 
});

// Graceful shutdown
process.on('SIGTERM', () => { 
  logger.info('SIGTERM received, shutting down gracefully'); 
  db.close();
  process.exit(0); 
});

process.on('SIGINT', () => { 
  logger.info('SIGINT received, shutting down gracefully'); 
  db.close();
  process.exit(0); 
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Quran Admin Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;