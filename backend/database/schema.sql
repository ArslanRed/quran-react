PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'editor', -- admin, editor, viewer
    is_active INTEGER DEFAULT 1, -- 0=false, 1=true
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Surahs table
CREATE TABLE IF NOT EXISTS surahs (
    id INTEGER PRIMARY KEY,
    name_arabic TEXT NOT NULL,
    name_english TEXT NOT NULL,
    name_transliterated TEXT NOT NULL,
    revelation_type TEXT NOT NULL, -- meccan, medinan
    number_of_ayahs INTEGER NOT NULL,
    bismillah_pre INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ayahs table
CREATE TABLE IF NOT EXISTS ayahs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surah_id INTEGER NOT NULL,
    number_in_surah INTEGER NOT NULL,
    number_in_quran INTEGER NOT NULL,
    text_arabic TEXT NOT NULL,
    text_uthmani TEXT,
    juz_number INTEGER,
    hizb_number INTEGER,
    rub_number INTEGER,
    sajdah_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (surah_id) REFERENCES surahs(id) ON DELETE CASCADE,
    UNIQUE(surah_id, number_in_surah),
    UNIQUE(number_in_quran)
);

-- Languages table
CREATE TABLE IF NOT EXISTS languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    direction TEXT DEFAULT 'ltr', -- ltr, rtl
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Translation sources table
CREATE TABLE IF NOT EXISTS translation_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    author TEXT,
    language_id INTEGER NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(language_id) REFERENCES languages(id)
);

-- Translations table
CREATE TABLE IF NOT EXISTS translations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ayah_id INTEGER NOT NULL,
    source_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    footnotes TEXT,
    is_approved INTEGER DEFAULT 0,
    approved_by INTEGER,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ayah_id) REFERENCES ayahs(id) ON DELETE CASCADE,
    FOREIGN KEY(source_id) REFERENCES translation_sources(id),
    FOREIGN KEY(approved_by) REFERENCES users(id),
    UNIQUE(ayah_id, source_id)
);

-- Reciters table
CREATE TABLE IF NOT EXISTS reciters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_arabic TEXT,
    style TEXT,
    country TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audio files table
CREATE TABLE IF NOT EXISTS audio_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ayah_id INTEGER NOT NULL,
    reciter_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    duration REAL,
    bit_rate INTEGER,
    sample_rate INTEGER,
    format TEXT DEFAULT 'mp3',
    quality TEXT DEFAULT 'medium', -- low, medium, high
    is_active INTEGER DEFAULT 1,
    uploaded_by INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ayah_id) REFERENCES ayahs(id) ON DELETE CASCADE,
    FOREIGN KEY(reciter_id) REFERENCES reciters(id),
    FOREIGN KEY(uploaded_by) REFERENCES users(id),
    UNIQUE(ayah_id, reciter_id)
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_name TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    data_type TEXT DEFAULT 'string',
    is_public INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
