import Database from "better-sqlite3";
import path from "path";
import { courses } from "../../src/courses";
import { EXAM_DATABASE } from "../../src/exams";

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
    certificate_downloaded_at TEXT,
    course_completed_at TEXT,
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
  db.exec("ALTER TABLE enrollments ADD COLUMN certificate_downloaded_at TEXT;");
} catch (_) {}
try {
  db.exec("ALTER TABLE enrollments ADD COLUMN course_completed_at TEXT;");
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
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id TEXT NOT NULL,
      chapter TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL,
      youtube_channel_id TEXT,
      is_chosen_for_recording INTEGER DEFAULT 0,
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);
  console.log("[DB SETUP] Dynamic lessons key table guaranteed.");
} catch (e: any) {
  console.error("Failed to create lessons table:", e.message);
}

try {
  db.exec("ALTER TABLE lessons ADD COLUMN youtube_channel_id TEXT;");
  console.log("[DB SETUP] Added youtube_channel_id column to lessons table.");
} catch (_) {}

try {
  db.exec("ALTER TABLE lessons ADD COLUMN is_chosen_for_recording INTEGER DEFAULT 0;");
  console.log("[DB SETUP] Added is_chosen_for_recording column to lessons table.");
} catch (_) {}

try {
  db.exec("ALTER TABLE exams ADD COLUMN lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL;");
  console.log("[DB SETUP] Added lesson_id foreign key reference to exams.");
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

  // Seeding final exams for other courses in the EXAM_DATABASE if they do not exist
  try {
    for (const courseIdKey of Object.keys(EXAM_DATABASE)) {
      const examCheckAny = db.prepare("SELECT id FROM exams WHERE course_id = ? AND exam_type = 'final'").get(courseIdKey);
      if (!examCheckAny) {
        console.log(`[DB SEEDER] Seeding final exam for Course ID: ${courseIdKey}...`);
        
        const matchedCourse = courses.find(c => c.id === courseIdKey);
        const courseTitle = matchedCourse ? matchedCourse.title : courseIdKey;
        
        const insertExam = db.prepare(`
          INSERT INTO exams (course_id, chapter_id, title, description, is_published, duration_minutes, questions_to_display, passing_score_percentage, exam_type)
          VALUES (?, NULL, ?, ?, 1, 25, 5, 80, 'final')
        `);
        
        const examResult = insertExam.run(
          courseIdKey,
          `${courseTitle} Final Exam`,
          `The final comprehensive certification exam for MountTech Academy's "${courseTitle}" curriculum.`
        );
        
        const examId = examResult.lastInsertRowid;
        const insertQuestion = db.prepare(`
          INSERT INTO exam_questions (exam_id, question_text, question_type, options, correct_answer, points)
          VALUES (?, ?, 'multiple_choice', ?, ?, 1)
        `);
        
        const examQuestions = EXAM_DATABASE[courseIdKey];
        for (const q of examQuestions) {
          const correctText = q.options[q.correctIndex];
          insertQuestion.run(
            Number(examId),
            q.question,
            JSON.stringify(q.options),
            correctText
          );
        }
        console.log(`[DB SEEDER] Successfully seeded final exam for ${courseIdKey} with ${examQuestions.length} questions.`);
      }
    }
  } catch (seedErr: any) {
    console.error("[DB SEEDER ERROR] Failed to seed extra courses final exams:", seedErr.message);
  }

  // Adjust pre-existing JAX chapter exams' exam_type to be 'lesson' instead of 'final'
  try {
    db.exec(`
      UPDATE exams 
      SET exam_type = 'lesson' 
      WHERE course_id = 'build-train-llm-jax' 
        AND chapter_id IS NOT NULL 
        AND chapter_id != '' 
        AND chapter_id != 'final'
    `);
    console.log("[DB SEEDER] Configured chapter assessments to be exam_type = 'lesson'.");
  } catch (err: any) {
    console.error("Failed to update JAX chapter exams type:", err.message);
  }

  // Sync existing baseline course syllabus elements with lessons table
  try {
    const allCourses = db.prepare("SELECT id, syllabus FROM courses").all() as { id: string; syllabus: string }[];
    for (const course of allCourses) {
      const existingLessonsCount = db.prepare("SELECT COUNT(*) as count FROM lessons WHERE course_id = ?").get(course.id) as { count: number };
      if (existingLessonsCount.count === 0) {
        console.log(`[DB SYNC] Populating lessons for Course: ${course.id}...`);
        const syllabus = JSON.parse(course.syllabus || "[]") as { chapter: string; title: string; description?: string }[];
        const insertLesson = db.prepare(`
          INSERT INTO lessons (course_id, chapter, title, description, order_index)
          VALUES (?, ?, ?, ?, ?)
        `);
        syllabus.forEach((item, idx) => {
          insertLesson.run(
            course.id,
            item.chapter || `Lesson ${idx + 1}`,
            item.title || "",
            item.description || "",
            idx + 1 // 1-based order_index
          );
        });
      }
    }

    // Connect pre-seeded JAX exams to their newly compiled lesson rows
    const jaxLessons = db.prepare("SELECT id, chapter FROM lessons WHERE course_id = 'build-train-llm-jax'").all() as { id: number; chapter: string }[];
    for (const lesson of jaxLessons) {
      db.prepare(`
        UPDATE exams 
        SET lesson_id = ? 
        WHERE course_id = 'build-train-llm-jax' AND LOWER(chapter_id) = LOWER(?)
      `).run(lesson.id, lesson.chapter);
    }
    console.log("[DB SYNC] Successfully bound pre-seeded JAX exams to lesson IDs.");
  } catch (syncErr: any) {
    console.error("[DB SYNC ERROR] Failed to synchronize lessons table or map lesson IDs:", syncErr.message);
  }

  // Seed Chapter-specific problems to lesson_problems table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lesson_problems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description_markdown TEXT,
        starter_code TEXT,
        FOREIGN KEY(lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
      );
    `);
    console.log("[DB SETUP] lesson_problems table guaranteed.");

    const allLessons = db.prepare("SELECT id, title FROM lessons").all() as { id: number; title: string }[];
    const checkProblems = db.prepare("SELECT count(*) as count FROM lesson_problems WHERE lesson_id = ?");
    const insertProblem = db.prepare(`
      INSERT INTO lesson_problems (lesson_id, title, description_markdown, starter_code)
      VALUES (?, ?, ?, ?)
    `);

    for (const lesson of allLessons) {
      const hasProblems = (checkProblems.get(lesson.id) as { count: number }).count > 0;
      if (!hasProblems) {
        const t = lesson.title.toLowerCase();
        let exercises = [
          {
            title: "Interactive Hello World",
            desc: "Write a script that prints a formatted welcome message to the Mountech Academy Python sandbox, indicating the current chapter runtime is fully functional.",
            starter: "import sys\n\nprint(\"Mountech Canvas Standard Playground\")\nprint(f\"Python Version: {sys.version}\")\n\n# Try writing your code here\n"
          },
          {
            title: "Basic Math Challenge",
            desc: "Write a simple function `multiply(a, b)` that returns the product of two numbers, and test it with several assertion printouts.",
            starter: "def multiply(a, b):\n    # Write logic here\n    return a * b\n\nprint(multiply(5, 7))\n"
          }
        ];

        if (t.includes("performance") || t.includes("jax") || t.includes("transformation") || t.includes("compile") || t.includes("optimization")) {
          exercises = [
            {
              title: "Functional Purity Proof",
              desc: "Demonstrate functional purity by writing a pure function `square_all(numbers)` that takes a list of integers and returns a new list of their squares without mutating the input argument.",
              starter: "def square_all(nums):\n    # Return squared items in a new list\n    return [n ** 2 for n in nums]\n\nmy_data = [1, 2, 3, 4]\nprint(\"Squared arrays:\", square_all(my_data))\nprint(\"Original holds pure:\", my_data)\n"
            },
            {
              title: "Abstract Gradient Mockup",
              desc: "Calculate derivative vectors. Represent a mathematical function $f(x) = 3x^2 + 5x + 2$ and write a helper function `numerical_derivative(f, x, h=0.0001)` to estimate the gradient slope at $x=2.0$.",
              starter: "def f(x):\n    return 3 * (x ** 2) + 5 * x + 2\n\ndef slope_at(func, x, h=1e-5):\n    # Estimate derivative using: (f(x+h) - f(x)) / h\n    return (func(x + h) - func(x)) / h\n\nprint(\"Estimated slope at x=2.0:\", slope_at(f, 2.0))\nprint(\"Analytical exact slope (6x + 5) is:\", 6 * 2.0 + 5)\n"
            }
          ];
        } else if (t.includes("prompt") || t.includes("guideline") || t.includes("chatgpt") || t.includes("instruction") || t.includes("llm")) {
          exercises = [
            {
              title: "Delimiter Formatting Lab",
              desc: "Write a utility function `wrap_xml(tag, text)` that formats content with clean XML delimiters to feed structured instructions safely into generative language models.",
              starter: "def wrap_xml(tag, text):\n    # Return formatted string with tag delimiters\n    return f\"<{tag}>\\n{text}\\n</{tag}>\"\n\nprint(wrap_xml(\"context\", \"MountTech specialized student workspace data\"))\n"
            },
            {
              title: "Few-Shot Prompt Engineering Generator",
              desc: "Create a template-driven function that structures a prompt using few-shot exemplars inside a single Python script. The prompt should teach a sentiment analyzer to classify tech reviews.",
              starter: "def compile_few_shot_prompt(target_review):\n    few_shots = [\n        (\"Code compiles in 2s. Excellent system.\", \"POSITIVE\"),\n        (\"Bug crash in loading Pyodide packages. Frustrated.\", \"NEGATIVE\"),\n    ]\n    \n    prompt_lines = [\"Classify the sentiment of the terminal review as either POSITIVE or NEGATIVE:\\n\"]\n    for text, label in few_shots:\n        prompt_lines.append(f\"Review: {text}\\nSentiment: {label}\\n\")\n    \n    prompt_lines.append(f\"Review: {target_review}\\nSentiment:\")\n    return \"\\n\".join(prompt_lines)\n\nprint(compile_few_shot_prompt(\"Fast, clean WebAssembly Python IDE. Outstanding!\"))\n"
            }
          ];
        } else if (t.includes("token") || t.includes("pipeline") || t.includes("data") || t.includes("preprocess") || t.includes("stream")) {
          exercises = [
            {
              title: "Custom Vocabulary Dictionary split",
              desc: "Simulate a naive space-based whitespace parser that returns structural tokens of a text corpus alongside sequence length counts.",
              starter: "def naive_tokenizer(corpus):\n    words = corpus.strip().split()\n    # Create standard 1-based index vocabs mapping\n    vocab = {word: idx + 1 for idx, word in enumerate(set(words))}\n    encoded = [vocab[w] for w in words]\n    return vocab, encoded\n\nsample = \"JAX compiles pure numerical arrays via XLA machine compile arrays\"\nword_dict, encoded_tokens = naive_tokenizer(sample)\nprint(\"Vocabulary Dictionary:\", word_dict)\nprint(\"Encoded Sequence:\", encoded_tokens)\n"
            }
          ];
        }

        for (const ex of exercises) {
          insertProblem.run(lesson.id, ex.title, ex.desc, ex.starter);
        }
      }
    }
    console.log("[DB SEEDER] lesson_problems populated successfully with chapter-specific exercises.");
  } catch (probErr: any) {
    console.error("[DB SEEDER ERROR] lesson_problems seeding failed:", probErr.message);
  }

  // Create Live Code Push Challenge tables
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS live_challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        live_session_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description_markdown TEXT,
        starter_code TEXT,
        is_active INTEGER DEFAULT 1,
        duration_seconds INTEGER DEFAULT 120,
        pushed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS live_challenge_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        live_challenge_id INTEGER NOT NULL,
        student_email TEXT NOT NULL,
        student_name TEXT NOT NULL,
        duration_seconds_taken INTEGER NOT NULL,
        submitted_at TEXT NOT NULL,
        status TEXT NOT NULL,
        submitted_code TEXT
      );
    `);
    console.log("[DB SETUP] live_challenges and live_challenge_submissions tables guaranteed.");
  } catch (err: any) {
    console.error("[DB SETUP ERROR] live_challenges tables creation failed:", err.message);
  }

  // Create instructor_slides table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS instructor_slides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instructor_id TEXT NOT NULL,
        lesson_id TEXT NOT NULL,
        slide_content TEXT NOT NULL,
        format_type TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(instructor_id, lesson_id)
      );
    `);
    console.log("[DB SETUP] instructor_slides table guaranteed.");
  } catch (err: any) {
    console.error("[DB SETUP ERROR] instructor_slides table creation failed:", err.message);
  }

  // Create slide_revisions table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS slide_revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id TEXT NOT NULL,
        instructor_id TEXT NOT NULL,
        slide_content TEXT NOT NULL,
        format_type TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    console.log("[DB SETUP] slide_revisions table guaranteed.");
  } catch (err: any) {
    console.error("[DB SETUP ERROR] slide_revisions table creation failed:", err.message);
  }

} catch (seedingError: any) {
  console.error("[DB SEEDER ERROR] Seeding aborted because:", seedingError.message);
}

export default db;
