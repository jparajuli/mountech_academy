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
    payment_method TEXT DEFAULT 'stripe',
    payment_status TEXT DEFAULT 'completed',
    payment_reference TEXT,
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
  db.exec("ALTER TABLE enrollments ADD COLUMN payment_method TEXT DEFAULT 'stripe';");
} catch (_) {}
try {
  db.exec("ALTER TABLE enrollments ADD COLUMN payment_status TEXT DEFAULT 'completed';");
} catch (_) {}
try {
  db.exec("ALTER TABLE enrollments ADD COLUMN payment_reference TEXT;");
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
  db.exec("ALTER TABLE courses ADD COLUMN syllabus_last_updated_at TEXT;");
} catch (_) {}

try {
  db.exec("ALTER TABLE courses ADD COLUMN syllabus_last_updated_by INTEGER;");
} catch (_) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id TEXT NOT NULL,
      chapter_id TEXT,
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
  db.exec("ALTER TABLE exams ADD COLUMN chapter_id TEXT;");
} catch (_) {}

try {
  db.exec("ALTER TABLE exams ADD COLUMN exam_type TEXT NOT NULL DEFAULT 'final';");
} catch (_) {}

try {
  db.exec("ALTER TABLE exams ADD COLUMN lesson_reference TEXT;");
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

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS gitlab_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gitlabRepoUrl TEXT NOT NULL UNIQUE,
      status TEXT,
      grade TEXT,
      commitHash TEXT
    );
  `);
} catch (_) {}

// Dynamic baseline database seeding for integrated professional sandbox courses
try {
  const insertCourse = db.prepare(`
    INSERT INTO courses (
      id, title, type, difficulty, topic, description, fullDescription,
      instructorName, instructorTitle, duration, lessonCount, rating, enrolledCount,
      partnerName, skillsAcquired, requirements, syllabus, thumbnailBg, thumbnailIconCode, isPaid, price, is_locked
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  let seededCount = 0;
  for (const c of courses) {
    const existing = db.prepare("SELECT id FROM courses WHERE id = ?").get(c.id) as any;
    if (!existing) {
      console.log(`[DB SEEDER] Inserting baseline course: ${c.title}...`);
      insertCourse.run(
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
      seededCount++;
    }
  }
  if (seededCount > 0) {
    console.log(`[DB SEEDER] Successfully populated database with ${seededCount} new course(s).`);
  }

  // Auto-seed Course Assessments (Chapter exams & Final exam) for the JAX course
  const courseId = 'build-train-llm-jax';
  const examCheck = db.prepare("SELECT id FROM exams WHERE course_id = ?").get(courseId);

  if (!examCheck) {
    console.log(`[DB SEEDER] Seeding chapter and final evaluations for Course ID: ${courseId}...`);
    
    const jaxExams = [
      {
        chapter_id: 'Lesson 1',
        title: 'Lesson 1 Assessment: High-Performance Computing',
        description: 'Test your understanding of JAX functional programming, pure functions, prng key system, and transformation foundations.',
        duration_minutes: 10,
        questions_to_display: 2,
        passing_score_percentage: 100,
        is_published: 1,
        questions: [
          {
            question_text: 'What makes a function "pure" in the functional programming paradigm demanded by JAX?',
            question_type: 'multiple_choice',
            options: [
              'It contains print statements and saves weights to global dictionary keys',
              'It depends only on its input arguments, has no stateful side-effects, and returns identical results for identical inputs',
              'It executes exclusively on CPU accelerators while blocking GPU operations',
              'It uses random initialization without explicit PRNG key splits'
            ],
            correct_answer: 'It depends only on its input arguments, has no stateful side-effects, and returns identical results for identical inputs'
          },
          {
            question_text: 'Inside JAX, why does normal random number generation use explicit key splits (jax.random.split) rather than stateful generators like in NumPy or PyTorch?',
            question_type: 'multiple_choice',
            options: [
              'JAX lacks proper numeric algorithms to generate float-based random numbers in Python',
              'To maintain functional purity, reproducibility, and prevent invisible internal state mutations during parallel device execution',
              'To restrict operations to TPUs without requiring host execution',
              'To automatically calculate backward gradients on stochastic layers'
            ],
            correct_answer: 'To maintain functional purity, reproducibility, and prevent invisible internal state mutations during parallel device execution'
          }
        ]
      },
      {
        chapter_id: 'Lesson 2',
        title: 'Lesson 2 Assessment: XLA & JIT Compilation',
        description: 'Evaluate your knowledge of abstract tracers, static argument rules, and XLA compiler engine compilation loops.',
        duration_minutes: 10,
        questions_to_display: 2,
        passing_score_percentage: 100,
        is_published: 1,
        questions: [
          {
            question_text: 'How does JAX\'s Just-In-Time compiling decorator @jit interact with pure functions to increase performance?',
            question_type: 'multiple_choice',
            options: [
              'It converts standard text strings to compact C++ source files on disk',
              'It compiles a static computation graph of the function via XLA and fuses elementary math ops to execute on hardware accelerators',
              'It compiles Python packages into standalone Node.js bundles',
              'It runs standard backpropagation loops on deep learning weights without requiring hardware units'
            ],
            correct_answer: 'It compiles a static computation graph of the function via XLA and fuses elementary math ops to execute on hardware accelerators'
          },
          {
            question_text: 'Under what condition will a standard Python condition "if x > 0:" cause a Tracer error during @jit compilation in JAX?',
            question_type: 'multiple_choice',
            options: [
              'When "x" is a static integer declared as a non-grad variable',
              'When "x" is a dynamic JAX Array Tracer, since its values are undetermined during abstract evaluation',
              'When the operation is executed on CPU backend clusters',
              'When the function returns a single floating-point scalar value'
            ],
            correct_answer: 'When "x" is a dynamic JAX Array Tracer, since its values are undetermined during abstract evaluation'
          }
        ]
      },
      {
        chapter_id: 'Lesson 3',
        title: 'Lesson 3 Assessment: Defining the 20M Transformer with Flax',
        description: 'Audit your understanding of Flax Linen components, Custom compact blocks, Multi-Head Attention, and Causal Masking mechanisms.',
        duration_minutes: 10,
        questions_to_display: 2,
        passing_score_percentage: 100,
        is_published: 1,
        questions: [
          {
            question_text: 'In the Flax Linen framework, what is the purpose of the @compact decorator on custom Linen module methods?',
            question_type: 'multiple_choice',
            options: [
              'It compresses model weights from Float32 to Float8 parameters',
              'It allows developers to define submodules and initialize parameters inline directly in the __call__ function',
              'It deletes inactive layer attributes to save GPU virtual memory allocations',
              'It serializes model parameters into optimized JSON string layouts'
            ],
            correct_answer: 'It allows developers to define submodules and initialize parameters inline directly in the __call__ function'
          },
          {
            question_text: 'Why is the standard attention block in a Decoder-only LLM masked?',
            question_type: 'multiple_choice',
            options: [
              'To encrypt personal user tokens before passing arrays to dense nodes',
              'To enforce causality, preventing the model from attending to future tokens during training',
              'To reduce gradient memory usage by deactivating half of the key vectors',
              'To accelerate matrix multiplying routines using sparse formats'
            ],
            correct_answer: 'To enforce causality, preventing the model from attending to future tokens during training'
          }
        ]
      },
      {
        chapter_id: 'Lesson 4',
        title: 'Lesson 4 Assessment: High-Throughput Tokenization',
        description: 'Probe your mastery of token vocabulary, sharded files streaming, and asynchronous pipeline mechanics.',
        duration_minutes: 10,
        questions_to_display: 2,
        passing_score_percentage: 100,
        is_published: 1,
        questions: [
          {
            question_text: 'When structuring high-performance training data pipelines for LLMs, why is it recommended to perform tokenizer operations on the CPU rather than the GPU?',
            question_type: 'multiple_choice',
            options: [
              'Because modern tokenization is primarily memory-bound with heavy string manipulation that lacks matrix multiplication parallelism',
              'Because GPUs do not support integer conversions or basic list indexing rules',
              'Because tokenization must only happen on local database machines',
              'Because TPU units prohibit loading any textual files'
            ],
            correct_answer: 'Because modern tokenization is primarily memory-bound with heavy string manipulation that lacks matrix multiplication parallelism'
          },
          {
            question_text: 'What is the main benefit of streaming sharded datasets directly from cloud files during LLM pre-training?',
            question_type: 'multiple_choice',
            options: [
              'It deletes previous backup files dynamically to save cloud subscription fees',
              'It prevents consuming massive local host RAM, allowing training on huge datasets that exceed system storage boundaries',
              'It automatically fine-tunes model hyperparameters before starting computation',
              'It translates source tokens to international standard symbols'
            ],
            correct_answer: 'It prevents consuming massive local host RAM, allowing training on huge datasets that exceed system storage boundaries'
          }
        ]
      },
      {
        chapter_id: 'Lesson 5',
        title: 'Lesson 5 Assessment: Stateful Optimizer and Training Loop',
        description: 'Test your grasp of values & grads, stateless updates, and Flax TrainState trackers.',
        duration_minutes: 10,
        questions_to_display: 2,
        passing_score_percentage: 100,
        is_published: 1,
        questions: [
          {
            question_text: 'How does Flax\'s TrainState help developers manage state in a functional environment like JAX where weights cannot be modified in-place?',
            question_type: 'multiple_choice',
            options: [
              'By writing weights to local SQLite relational indexes on every compile step',
              'By bundling the model parameters, optimizer state, and step index together into a single immutable container returned as a new instance each iteration',
              'By translating Python values to external browser cache memory keys',
              'By freezing neural network weights so they cannot be updated through gradient steps'
            ],
            correct_answer: 'By bundling the model parameters, optimizer state, and step index together into a single immutable container returned as a new instance each iteration'
          },
          {
            question_text: 'Under standard JAX APIs, what is the best practice for calculating gradients alongside training loss simultaneously?',
            question_type: 'multiple_choice',
            options: [
              'By running jax.grad followed by a second independent forward pass to double-check accuracy',
              'By using jax.value_and_grad on your loss function, which computes the objective scalar value and vectors in a single efficient compile graph',
              'By querying the SQLite table logs to monitor model improvements',
              'By setting the learning rate schedule parameters to a random seed key'
          ],
            correct_answer: 'By using jax.value_and_grad on your loss function, which computes the objective scalar value and vectors in a single efficient compile graph'
          }
        ]
      },
      {
        chapter_id: 'Lesson 6',
        title: 'Lesson 6 Assessment: Distributed Scaling & Sharding Parallelism',
        description: 'Review your synchronization primitives, data scale meshes, and cluster topologies.',
        duration_minutes: 10,
        questions_to_display: 2,
        passing_score_percentage: 100,
        is_published: 1,
        questions: [
          {
            question_text: 'In JAX, how does pmap (Parallel Map) distribute gradients across multi-device configurations during data-parallel training?',
            question_type: 'multiple_choice',
            options: [
              'It copies weights to individual CSV file segments in host directories',
              'It maps execution across multiple GPU/TPU devices in parallel, combined with collective communication primitives (like lax.pmean) to synchronize gradients',
              'It runs model steps sequentially on a single chip while utilizing multiple threads',
              'It deletes dynamic variable weights to maintain parameter coherence'
            ],
            correct_answer: 'It maps execution across multiple GPU/TPU devices in parallel, combined with collective communication primitives (like lax.pmean) to synchronize gradients'
          },
          {
            question_text: 'What is the purpose of establishing a dynamic "Device Mesh" in multi-dimensional sharding APIs like jax.sharding?',
            question_type: 'multiple_choice',
            options: [
              'To translate model output strings to internet graphic charts',
              'To logically lay out physical chips (GPUs/TPUs) into a multi-dimensional coordinate grid, mapping tensor dimensions to specific device axes',
              'To restrict operations to local server ports to protect key APIs',
              'To configure hardware ventilation systems'
            ],
            correct_answer: 'To logically lay out physical chips (GPUs/TPUs) into a multi-dimensional coordinate grid, mapping tensor dimensions to specific device axes'
          }
        ]
      },
      {
        chapter_id: null,
        title: 'Build and Train an LLM with JAX Final Exam',
        description: 'The final comprehensive certification exam for MountTech Academy\'s "Build and Train an LLM with JAX" curriculum.',
        duration_minutes: 25,
        questions_to_display: 5,
        passing_score_percentage: 80,
        is_published: 1,
        questions: [
          {
            question_text: 'In JAX, what holds true for Just-In-Time compilation compiled using @jit?',
            question_type: 'multiple_choice',
            options: [
              'It allows standard in-place array mutation (like x[0] = 5) natively inside the block',
              'It requires compilation on every single function call, which increases GPU cluster latency',
              'It compiles pure functional paths using XLA, tracing functions on the first invocation with abstract tracer representations',
              'It disables all automatic differentiation tools inside subsequent JAX steps'
            ],
            correct_answer: 'It compiles pure functional paths using XLA, tracing functions on the first invocation with abstract tracer representations'
          },
          {
            question_text: 'In JAX programming, if you require to take the derivative of an output with respect to inputs, which transformation standard is designed for this?',
            question_type: 'multiple_choice',
            options: [
              'jax.vmap (Vectorized Map)',
              'jax.jit code transformation',
              'jax.grad (Automatic Gradient)',
              'jax.pmap device scaling'
            ],
            correct_answer: 'jax.grad (Automatic Gradient)'
          },
          {
            question_text: 'How does Optax integrate with Flax-based neural structures during training?',
            question_type: 'multiple_choice',
            options: [
              'It compiles visual HTML canvas graphics to explore active token parameters',
              'It is an independent library that manages stateless parameter optimization updates and learning rate schedulers in JAX',
              'It saves model parameters to cloud database servers in real-time on every pass',
              'It enforces causal attention inside Linen layers'
            ],
            correct_answer: 'It is an independent library that manages stateless parameter optimization updates and learning rate schedulers in JAX'
          },
          {
            question_text: 'What is a "Tracer" in JAX, and when are Tracers generated?',
            question_type: 'multiple_choice',
            options: [
              'A logger tool that saves model files on local host servers',
              'An abstract placeholder object passed through JAX code during compilation to map execution steps into an XLA Jaxpr graph',
              'An API variable that converts Python floats to database strings',
              'A custom debugger extension designed for Microsoft AutoGen'
            ],
            correct_answer: 'An abstract placeholder object passed through JAX code during compilation to map execution steps into an XLA Jaxpr graph'
          },
          {
            question_text: 'What mechanism should you use to vectorize a function in JAX along a new dimension without writing a manual Python loop?',
            question_type: 'multiple_choice',
            options: [
              'jax.grad gradient extraction',
              'jax.vmap (Vectorized Map)',
              'jax.jit code compilation',
              'jax.random.split keys layout'
            ],
            correct_answer: 'jax.vmap (Vectorized Map)'
          }
        ]
      }
    ];

    const insertExam = db.prepare(`
      INSERT INTO exams (course_id, chapter_id, title, description, is_published, duration_minutes, questions_to_display, passing_score_percentage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertQuestion = db.prepare(`
      INSERT INTO exam_questions (exam_id, question_text, question_type, options, correct_answer, points)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    for (const ex of jaxExams) {
      const examResult = insertExam.run(
        courseId,
        ex.chapter_id,
        ex.title,
        ex.description,
        ex.is_published,
        ex.duration_minutes,
        ex.questions_to_display,
        ex.passing_score_percentage
      );

      const examId = examResult.lastInsertRowid;
      for (const q of ex.questions) {
        insertQuestion.run(
          Number(examId),
          q.question_text,
          q.question_type,
          JSON.stringify(q.options),
          q.correct_answer
        );
      }
    }
    console.log(`[DB SEEDER] Successfully seeded ${jaxExams.length} JAX exams with associated MCQ validations.`);
  }

} catch (seedingError: any) {
  console.error("[DB SEEDER ERROR] Seeding aborted because:", seedingError.message);
}

export default db;
