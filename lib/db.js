import Database from 'better-sqlite3';
import path from 'path';

// Connect to or create a local SQLite database
const dbPath = path.resolve(process.cwd(), 'apiron.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize the schema if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    cover_url TEXT,
    rating INTEGER DEFAULT 0,
    review TEXT DEFAULT '',
    x_pos REAL DEFAULT 0,
    y_pos REAL DEFAULT 0,
    z_index INTEGER DEFAULT 0,
    status TEXT DEFAULT 'To Read',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    quote TEXT NOT NULL,
    x_pos REAL DEFAULT 0,
    y_pos REAL DEFAULT 0,
    z_index INTEGER DEFAULT 0,
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS areas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    x_pos REAL DEFAULT 0,
    y_pos REAL DEFAULT 0,
    width REAL DEFAULT 200,
    height REAL DEFAULT 200,
    z_index INTEGER DEFAULT 0,
    color TEXT DEFAULT 'rgba(0, 170, 255, 0.08)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    x_pos REAL DEFAULT 0,
    y_pos REAL DEFAULT 0,
    width REAL DEFAULT 220,
    height REAL DEFAULT 150,
    z_index INTEGER DEFAULT 0,
    color TEXT DEFAULT 'rgba(255, 255, 255, 0.08)',
    wrap_text INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    label TEXT DEFAULT '',
    type TEXT DEFAULT 'default',
    arrow TEXT DEFAULT 'none',
    speed TEXT DEFAULT 'normal',
    shape TEXT DEFAULT 'curved',
    color TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pan_x REAL NOT NULL,
    pan_y REAL NOT NULL,
    scale REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pdfs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    x_pos REAL DEFAULT 0,
    y_pos REAL DEFAULT 0,
    width REAL DEFAULT 450,
    height REAL DEFAULT 600,
    z_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pdf_highlights (
    id TEXT PRIMARY KEY,
    pdf_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    text TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS drawings (
    id TEXT PRIMARY KEY,
    path_data TEXT NOT NULL,
    color TEXT DEFAULT '#00aaff',
    stroke_width INTEGER DEFAULT 4,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    x_pos REAL DEFAULT 0,
    y_pos REAL DEFAULT 0,
    width REAL DEFAULT 300,
    height REAL DEFAULT 300,
    z_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    director TEXT,
    cover_url TEXT,
    rating INTEGER DEFAULT 0,
    review TEXT DEFAULT '',
    x_pos REAL DEFAULT 0,
    y_pos REAL DEFAULT 0,
    z_index INTEGER DEFAULT 0,
    status TEXT DEFAULT 'To Watch',
    year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS movie_quotes (
    id TEXT PRIMARY KEY,
    movie_id TEXT NOT NULL,
    quote TEXT NOT NULL,
    x_pos REAL DEFAULT 0,
    y_pos REAL DEFAULT 0,
    z_index INTEGER DEFAULT 0,
    FOREIGN KEY(movie_id) REFERENCES movies(id) ON DELETE CASCADE
  );
`);

// Alter existing table to add wrap_text column if it doesn't exist
try {
  db.exec("ALTER TABLE notes ADD COLUMN wrap_text INTEGER DEFAULT 1");
} catch (e) {
  // Column already exists or table is new
}

// Alter existing table to add label column to links if it doesn't exist
try {
  db.exec("ALTER TABLE links ADD COLUMN label TEXT DEFAULT ''");
} catch (e) {
  // Column already exists or table is new
}

// Alter existing table to add type column to links if it doesn't exist
try {
  db.exec("ALTER TABLE links ADD COLUMN type TEXT DEFAULT 'default'");
} catch (e) {
  // Column already exists or table is new
}

// Alter existing table to add arrow column to links if it doesn't exist
try {
  db.exec("ALTER TABLE links ADD COLUMN arrow TEXT DEFAULT 'none'");
} catch (e) {
  // Column already exists or table is new
}

// Alter existing table to add speed column to links if it doesn't exist
try {
  db.exec("ALTER TABLE links ADD COLUMN speed TEXT DEFAULT 'normal'");
} catch (e) {
  // Column already exists or table is new
}

// Alter existing table to add shape column to links if it doesn't exist
try {
  db.exec("ALTER TABLE links ADD COLUMN shape TEXT DEFAULT 'curved'");
} catch (e) {
  // Column already exists or table is new
}

// Alter existing table to add color column to links if it doesn't exist
try {
  db.exec("ALTER TABLE links ADD COLUMN color TEXT DEFAULT NULL");
} catch (e) {
  // Column already exists or table is new
}

// Alter existing tables to add z_index column for layer ordering
["notes", "books", "pdfs", "images", "areas", "quotes", "movies", "movie_quotes"].forEach((table) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN z_index INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists or table is new
  }
});

export default db;
