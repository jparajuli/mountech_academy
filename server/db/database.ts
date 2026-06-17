import Database from "better-sqlite3";
import path from "path";
import { courses } from "../../src/courses";

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

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    topic TEXT NOT NULL,
    description TEXT NOT NULL,
    fullDescription TEXT NOT NULL,
    instructorName TEXT NOT NULL,
    instructorTitle TEXT NOT NULL,
    duration TEXT NOT NULL,
    lessonCount TEXT NOT NULL,
    rating REAL NOT NULL DEFAULT 4.5,
    enrolledCount TEXT NOT NULL DEFAULT '0',
    partnerName TEXT,
    skillsAcquired TEXT NOT NULL, -- JSON formatted array
    requirements TEXT NOT NULL, -- JSON formatted array
    syllabus TEXT NOT NULL, -- JSON formatted array
    thumbnailBg TEXT NOT NULL,
    thumbnailIconCode TEXT NOT NULL,
    isPaid INTEGER NOT NULL DEFAULT 0,
    price REAL DEFAULT 0,
    is_locked INTEGER NOT NULL DEFAULT 0,
    instructor_profile_id INTEGER REFERENCES instructor_profiles(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS live_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id TEXT NOT NULL,
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    meet_url TEXT NOT NULL,
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON live_sessions(course_id);

  CREATE TABLE IF NOT EXISTS instructor_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    academic_title TEXT NOT NULL,
    short_bio TEXT,
    linkedin_url TEXT,
    avatar_url TEXT,
    FOREIGN KEY(user_email) REFERENCES users(email) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_instructor_profiles_email ON instructor_profiles(user_email);

  CREATE TABLE IF NOT EXISTS course_instructors (
    course_id TEXT NOT NULL,
    instructor_profile_id INTEGER NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (course_id, instructor_profile_id),
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY(instructor_profile_id) REFERENCES instructor_profiles(id) ON DELETE CASCADE,
    UNIQUE(course_id, instructor_profile_id)
  );

  CREATE TABLE IF NOT EXISTS course_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id TEXT NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
  );
`);

// Dynamic resilient schema upgrades for password reset flows
try {
  db.exec("ALTER TABLE users ADD COLUMN resetToken TEXT;");
} catch (_) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN resetTokenExpires TEXT;");
} catch (_) {}
try {
  db.exec("ALTER TABLE courses ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;");
} catch (_) {}
try {
  db.exec("ALTER TABLE live_sessions ADD COLUMN reminder_sent INTEGER NOT NULL DEFAULT 0;");
} catch (_) {}
try {
  db.exec("ALTER TABLE courses ADD COLUMN instructor_profile_id INTEGER REFERENCES instructor_profiles(id) ON DELETE SET NULL;");
} catch (_) {}
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS course_instructors (
      course_id TEXT NOT NULL,
      instructor_profile_id INTEGER NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (course_id, instructor_profile_id),
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY(instructor_profile_id) REFERENCES instructor_profiles(id) ON DELETE CASCADE,
      UNIQUE(course_id, instructor_profile_id)
    );
  `);
} catch (_) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS course_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      file_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);
} catch (_) {}

try {
  db.exec("ALTER TABLE courses ADD COLUMN syllabus_content TEXT;");
} catch (_) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      is_published INTEGER NOT NULL DEFAULT 0,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);
} catch (_) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exam_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL,
      options TEXT, -- JSON array of options
      correct_answer TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );
  `);
} catch (_) {}

// Phase 1 Schema Expansion for Attempts and Grading Customization
try {
  db.exec("ALTER TABLE exams ADD COLUMN questions_to_display INTEGER NOT NULL DEFAULT 5;");
} catch (_) {}

try {
  db.exec("ALTER TABLE exams ADD COLUMN passing_score_percentage INTEGER NOT NULL DEFAULT 70;");
} catch (_) {}

try {
  db.exec("ALTER TABLE exams ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 30;");
} catch (_) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exam_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      score REAL,
      passed INTEGER, -- BOOLEAN: 0 or 1
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(email) ON DELETE CASCADE
    );
  `);
} catch (_) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      submitted_answer TEXT,
      is_correct INTEGER, -- BOOLEAN: 0 or 1
      FOREIGN KEY(attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,
      FOREIGN KEY(question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
    );
  `);
} catch (_) {}

// Dynamic baseline database seeding for integrated professional sandbox courses
try {
  const countObj = db.prepare("SELECT count(*) as count FROM courses").get() as any;
  if (!countObj || countObj.count === 0) {
    console.log("[DB SEEDER] Standard courses table is empty, importing baseline courses.ts static schema...");
    const insert = db.prepare(`
      INSERT INTO courses (
        id, title, type, difficulty, topic, description, fullDescription,
        instructorName, instructorTitle, duration, lessonCount, rating, enrolledCount,
        partnerName, skillsAcquired, requirements, syllabus, thumbnailBg, thumbnailIconCode, isPaid, price, is_locked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);
    for (const c of courses) {
      insert.run(
        c.id,
        c.title,
        c.type,
        c.difficulty,
        c.topic,
        c.description,
        c.fullDescription,
        c.instructorName,
        c.instructorTitle,
        c.duration,
        c.lessonCount,
        c.rating,
        c.enrolledCount,
        c.partnerName || null,
        JSON.stringify(c.skillsAcquired),
        JSON.stringify(c.requirements),
        JSON.stringify(c.syllabus),
        c.thumbnailBg,
        c.thumbnailIconCode,
        c.isPaid ? 1 : 0,
        c.price || 0
      );
    }
    console.log(`[DB SEEDER] Successfully populated database with ${courses.length} baseline courses.`);
  }
} catch (seedingError: any) {
  console.error("[DB SEEDER ERROR] Seeding aborted because:", seedingError.message);
}

export default db;
