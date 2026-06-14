import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "mountech.db");
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

// Setup core SQLite database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    passwordAlgorithm TEXT NOT NULL DEFAULT 'sha256', -- 'sha256' or 'bcrypt'
    role TEXT NOT NULL DEFAULT 'student',
    isVerified INTEGER NOT NULL DEFAULT 0, -- 0 for false, 1 for true
    verificationToken TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    courseId TEXT NOT NULL,
    courseTitle TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Enrolled',
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(email) REFERENCES users(email) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS logins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    details TEXT
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    courseId TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    review TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(email) REFERENCES users(email) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_enrollments_email ON enrollments(email);
  CREATE INDEX IF NOT EXISTS idx_ratings_course ON ratings(courseId);
  CREATE INDEX IF NOT EXISTS idx_logins_email ON logins(email);
`);

export default db;
