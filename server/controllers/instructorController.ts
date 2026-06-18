import { Request, Response } from "express";
import db from "../db/database.js";

// GET /api/instructors - Return all instructor profiles
export function listInstructors(req: Request, res: Response) {
  try {
    const profiles = db.prepare(`
      SELECT id, user_email, full_name, academic_title, short_bio, linkedin_url, avatar_url
      FROM instructor_profiles
      ORDER BY full_name ASC
    `).all() as any[];

    return res.json({
      success: true,
      profiles
    });
  } catch (err: any) {
    console.error("[LIST INSTRUCTORS ERR]", err);
    return res.status(500).json({ error: "Failed to retrieve instructor profiles: " + err.message });
  }
}

// GET /api/instructors/email/:email - Helper to fetch a profile by email
export function getInstructorByEmail(req: Request, res: Response) {
  const { email } = req.params;
  try {
    const profile = db.prepare(`
      SELECT id, user_email, full_name, academic_title, short_bio, linkedin_url, avatar_url
      FROM instructor_profiles
      WHERE LOWER(user_email) = ?
    `).get(email.trim().toLowerCase()) as any;

    if (!profile) {
      return res.status(404).json({ error: "Instructor profile not found for this email address." });
    }

    return res.json({
      success: true,
      profile
    });
  } catch (err: any) {
    console.error("[GET INSTRUCTOR BY EMAIL ERR]", err);
    return res.status(500).json({ error: "Failed to query instructor profile: " + err.message });
  }
}

// POST /api/admin/instructors - Admin only: Create profile linked to email
export function createInstructorProfile(req: Request, res: Response) {
  const { user_email, full_name, academic_title, short_bio, linkedin_url, avatar_url } = req.body;
  const normalizedEmail = user_email.trim().toLowerCase();

  try {
    // A. Verify that user exists in SQLite and has appropriate profile mapping
    const userExists = db.prepare("SELECT email, role FROM users WHERE LOWER(email) = ?").get(normalizedEmail) as { email: string; role: string } | undefined;
    if (!userExists) {
      return res.status(404).json({ error: `Pre-requisite missing: No registered scholar or user found with email "${user_email}". Please register them first.` });
    }

    // B. Prevent double mapping
    const existing = db.prepare("SELECT id FROM instructor_profiles WHERE LOWER(user_email) = ?").get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: "Conflict: This practitioner already has an instructor profile registered." });
    }

    // C. Perform the write
    const result = db.prepare(`
      INSERT INTO instructor_profiles (user_email, full_name, academic_title, short_bio, linkedin_url, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      normalizedEmail,
      full_name.trim(),
      academic_title.trim(),
      (short_bio || "").trim(),
      (linkedin_url || "").trim(),
      (avatar_url || "").trim()
    );

    // Optionally: Automatically upgrade user role to 'instructor' if they are currently a 'student'
    if (userExists.role === 'student') {
      db.prepare("UPDATE users SET role = 'instructor' WHERE LOWER(email) = ?").run(normalizedEmail);
    }

    return res.status(201).json({
      success: true,
      message: `Profile for "${full_name}" assigned successfully to ${normalizedEmail}.`,
      profileId: result.lastInsertRowid
    });
  } catch (err: any) {
    console.error("[CREATE INSTRUCTOR PROFILE ERR]", err);
    return res.status(500).json({ error: "Failed to allocate instructor credentials: " + err.message });
  }
}

// PUT /api/instructors/:id - Secure update routing (Admin OR matching Instructor email)
export function updateInstructorProfile(req: Request, res: Response) {
  const { id } = req.params;
  const { full_name, academic_title, short_bio, linkedin_url, avatar_url } = req.body;
  const user = (req as any).user;

  try {
    // 1. Fetch profile to inspect ownership
    const profile = db.prepare("SELECT * FROM instructor_profiles WHERE id = ?").get(id) as any;
    if (!profile) {
      return res.status(404).json({ error: "Requested instructor profile session does not exist." });
    }

    // 2. Custom authorization logic checks
    const isAdmin = user.role === "admin";
    const isMatchingInstructor = user.role === "instructor" && user.email.trim().toLowerCase() === profile.user_email.toLowerCase();

    if (!isAdmin && !isMatchingInstructor) {
      return res.status(403).json({
        error: "Access Denied: You do not hold sufficient clearance to modify this instructor credentials profile."
      });
    }

    // 3. Complete the update in database
    db.prepare(`
      UPDATE instructor_profiles
      SET full_name = ?, academic_title = ?, short_bio = ?, linkedin_url = ?, avatar_url = ?
      WHERE id = ?
    `).run(
      full_name.trim(),
      academic_title.trim(),
      (short_bio || "").trim(),
      (linkedin_url || "").trim(),
      (avatar_url || "").trim(),
      id
    );

    // Sync full name back to standard users table if matching
    try {
      db.prepare("UPDATE users SET name = ? WHERE LOWER(email) = ?").run(full_name.trim(), profile.user_email.toLowerCase());
    } catch (_) {}

    return res.json({
      success: true,
      message: "Instructor profile credentials updated successfully.",
      profile: {
        id: Number(id),
        user_email: profile.user_email,
        full_name: full_name.trim(),
        academic_title: academic_title.trim(),
        short_bio: (short_bio || "").trim(),
        linkedin_url: (linkedin_url || "").trim(),
        avatar_url: (avatar_url || "").trim()
      }
    });

  } catch (err: any) {
    console.error("[UPDATE INSTRUCTOR PROFILE ERR]", err);
    return res.status(500).json({ error: "Failed to persist profile modifications: " + err.message });
  }
}

// GET /api/instructor/dashboard - Return courses assigned to active instructor
export function getInstructorDashboard(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized access." });
  }

  try {
    const isAdmin = user.role === "admin";
    let rows: any[] = [];

    if (isAdmin) {
      // Admins see all courses
      rows = db.prepare(`
        SELECT c.*,
               json_group_array(
                 json_object(
                   'id', ip.id,
                   'name', ip.full_name,
                   'title', ip.academic_title,
                   'avatar', ip.avatar_url,
                   'display_order', ci.display_order
                 )
               ) AS instructors_json
        FROM courses c
        LEFT JOIN course_instructors ci ON c.id = ci.course_id
        LEFT JOIN instructor_profiles ip ON ci.instructor_profile_id = ip.id
        GROUP BY c.id
      `).all() as any[];
    } else {
      const profile = db.prepare("SELECT id FROM instructor_profiles WHERE LOWER(user_email) = ?").get(user.email.trim().toLowerCase()) as any;
      if (!profile) {
        return res.json({ success: true, courses: [] });
      }

      rows = db.prepare(`
        SELECT c.*,
               json_group_array(
                 json_object(
                   'id', ip.id,
                   'name', ip.full_name,
                   'title', ip.academic_title,
                   'avatar', ip.avatar_url,
                   'display_order', ci.display_order
                 )
               ) AS instructors_json
        FROM courses c
        LEFT JOIN course_instructors ci ON c.id = ci.course_id
        LEFT JOIN instructor_profiles ip ON ci.instructor_profile_id = ip.id
        WHERE c.id IN (
          SELECT course_id FROM course_instructors WHERE instructor_profile_id = ?
        )
        GROUP BY c.id
      `).all(profile.id) as any[];
    }

    const courses = rows.map((r: any) => {
      let instructors: any[] = [];
      try {
        const parsed = JSON.parse(r.instructors_json);
        if (Array.isArray(parsed)) {
          instructors = parsed.filter((inst: any) => inst && inst.id !== null);
          instructors.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        }
      } catch (err) {
        instructors = [];
      }

      const primaryInst = instructors[0] || null;

      return {
        id: r.id,
        title: r.title,
        type: r.type,
        difficulty: r.difficulty,
        topic: r.topic,
        description: r.description,
        fullDescription: r.fullDescription,
        instructorName: primaryInst ? primaryInst.name : r.instructorName,
        instructorTitle: primaryInst ? primaryInst.title : r.instructorTitle,
        duration: r.duration,
        lessonCount: r.lessonCount,
        rating: r.rating,
        enrolledCount: r.enrolledCount,
        partnerName: r.partnerName,
        skillsAcquired: JSON.parse(r.skillsAcquired || "[]"),
        requirements: JSON.parse(r.requirements || "[]"),
        syllabus: JSON.parse(r.syllabus || "[]"),
        thumbnailBg: r.thumbnailBg,
        thumbnailIconCode: r.thumbnailIconCode,
        isPaid: r.isPaid === 1,
        price: r.price,
        isLocked: r.is_locked === 1,
        instructors: instructors.map(i => ({ id: i.id, name: i.name, title: i.title, avatar: i.avatar })),
        instructor: primaryInst ? {
          name: primaryInst.name,
          title: primaryInst.title,
          avatar: primaryInst.avatar
        } : null
      };
    });

    return res.json({ success: true, courses });
  } catch (err: any) {
    console.error("[GET INSTRUCTOR DASHBOARD ERR]", err);
    return res.status(500).json({ error: "Failed to retrieve instructor dashboard details: " + err.message });
  }
}

// GET /api/instructor/courses/:courseId/students - Return students for course
export function getCourseStudents(req: Request, res: Response) {
  const { courseId } = req.params;

  try {
    const students = db.prepare(`
      SELECT email, name, timestamp AS enrollmentDate
      FROM enrollments
      WHERE courseId = ?
      ORDER BY timestamp DESC
    `).all(courseId) as any[];

    return res.json({
      success: true,
      students
    });
  } catch (err: any) {
    console.error("[GET COURSE STUDENTS ERR]", err);
    return res.status(500).json({ error: "Failed to query enrolled student records: " + err.message });
  }
}

// GET /api/instructor/courses/:courseId/materials - Return materials for course
export function getCourseMaterials(req: Request, res: Response) {
  const { courseId } = req.params;

  try {
    const materials = db.prepare(`
      SELECT id, course_id, title, file_url, created_at
      FROM course_materials
      WHERE course_id = ?
      ORDER BY created_at DESC
    `).all(courseId) as any[];

    return res.json({
      success: true,
      materials
    });
  } catch (err: any) {
    console.error("[GET COURSE MATERIALS ERR]", err);
    return res.status(500).json({ error: "Failed to query course materials: " + err.message });
  }
}

// POST /api/instructor/courses/:courseId/materials - Add course material
export function createCourseMaterial(req: Request, res: Response) {
  const { courseId } = req.params;
  const { title, file_url } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Material title is required." });
  }
  if (!file_url || !file_url.trim()) {
    return res.status(400).json({ error: "File URL is required." });
  }

  try {
    const result = db.prepare(`
      INSERT INTO course_materials (course_id, title, file_url)
      VALUES (?, ?, ?)
    `).run(courseId, title.trim(), file_url.trim());

    const newMaterial = db.prepare(`
      SELECT id, course_id, title, file_url, created_at
      FROM course_materials
      WHERE id = ?
    `).get(result.lastInsertRowid) as any;

    return res.status(201).json({
      success: true,
      message: "Course material added successfully.",
      material: newMaterial
    });
  } catch (err: any) {
    console.error("[CREATE COURSE MATERIAL ERR]", err);
    return res.status(500).json({ error: "Failed to persist course material record: " + err.message });
  }
}

// PUT /api/instructor/courses/:courseId/syllabus - Update Syllabus Markdown
export function updateCourseSyllabus(req: Request, res: Response) {
  const { courseId } = req.params;
  const { syllabus_content } = req.body;

  try {
    db.prepare(`
      UPDATE courses SET syllabus_content = ? WHERE id = ?
    `).run(syllabus_content || "", courseId);

    return res.json({
      success: true,
      message: "Course syllabus updated successfully.",
      syllabus_content
    });
  } catch (err: any) {
    console.error("[UPDATE SYLLABUS ERR]", err);
    return res.status(500).json({ error: "Failed to update course syllabus: " + err.message });
  }
}

// POST /api/instructor/courses/:courseId/exams - Create a course exam
export function createCourseExam(req: Request, res: Response) {
  const { courseId } = req.params;
  const { title, description, is_published, questions_to_display, passing_score_percentage, duration_minutes } = req.body;

  try {
    const publishedVal = (is_published === true || is_published === 1) ? 1 : 0;
    const questionsToDisplayVal = Number(questions_to_display) || 5;
    const passingScoreVal = Number(passing_score_percentage) || 70;
    const durationMinutesVal = Number(duration_minutes) || 30;

    const result = db.prepare(`
      INSERT INTO exams (course_id, title, description, is_published, questions_to_display, passing_score_percentage, duration_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(courseId, title.trim(), (description || "").trim(), publishedVal, questionsToDisplayVal, passingScoreVal, durationMinutesVal);

    return res.status(201).json({
      success: true,
      message: "Course exam created successfully.",
      examId: result.lastInsertRowid
    });
  } catch (err: any) {
    console.error("[CREATE EXAM ERR]", err);
    return res.status(500).json({ error: "Failed to create course exam: " + err.message });
  }
}

// PUT /api/instructor/exams/:examId - Update course exam configurations
export function updateCourseExam(req: Request, res: Response) {
  const { examId } = req.params;
  const { title, description, is_published, questions_to_display, passing_score_percentage, duration_minutes } = req.body;

  try {
    const publishedVal = (is_published === true || is_published === 1) ? 1 : 0;
    const questionsToDisplayVal = Number(questions_to_display) || 5;
    const passingScoreVal = Number(passing_score_percentage) || 70;
    const durationMinutesVal = Number(duration_minutes) || 30;

    db.prepare(`
      UPDATE exams
      SET title = ?, description = ?, is_published = ?, questions_to_display = ?, passing_score_percentage = ?, duration_minutes = ?
      WHERE id = ?
    `).run(title.trim(), (description || "").trim(), publishedVal, questionsToDisplayVal, passingScoreVal, durationMinutesVal, examId);

    return res.json({
      success: true,
      message: "Exam updated successfully."
    });
  } catch (err: any) {
    console.error("[UPDATE EXAM CFG ERR]", err);
    return res.status(500).json({ error: "Failed to update course exam: " + err.message });
  }
}

// GET /api/instructor/courses/:courseId/exams - List course exams
export function listCourseExams(req: Request, res: Response) {
  const { courseId } = req.params;

  try {
    const exams = db.prepare(`
      SELECT * FROM exams WHERE course_id = ? ORDER BY id DESC
    `).all(courseId) as any[];

    // Hydrate exams with questions
    const hydratedExams = exams.map((exam) => {
      const questions = db.prepare(`
        SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY id ASC
      `).all(exam.id) as any[];

      return {
        ...exam,
        is_published: exam.is_published === 1,
        questions: questions.map(q => ({
          ...q,
          options: JSON.parse(q.options || "[]")
        }))
      };
    });

    return res.json({
      success: true,
      exams: hydratedExams
    });
  } catch (err: any) {
    console.error("[LIST EXAMS ERR]", err);
    return res.status(500).json({ error: "Failed to retrieve course exams: " + err.message });
  }
}

// POST /api/instructor/exams/:examId/questions - Add a question to an exam
export function createExamQuestion(req: Request, res: Response) {
  const { examId } = req.params;
  const { question_text, question_type, options, correct_answer, points } = req.body;

  try {
    const optionsJson = JSON.stringify(options || []);

    const result = db.prepare(`
      INSERT INTO exam_questions (exam_id, question_text, question_type, options, correct_answer, points)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(examId, question_text.trim(), question_type, optionsJson, correct_answer.trim(), points || 1);

    return res.status(201).json({
      success: true,
      message: "Exam question added successfully.",
      questionId: result.lastInsertRowid
    });
  } catch (err: any) {
    console.error("[CREATE QUESTION ERR]", err);
    return res.status(500).json({ error: "Failed to create exam question: " + err.message });
  }
}

// PUT /api/instructor/exams/:examId/questions/:questionId - Edit a question
export function updateExamQuestion(req: Request, res: Response) {
  const { examId, questionId } = req.params;
  const { question_text, question_type, options, correct_answer, points } = req.body;

  try {
    // Verify question matches this exam
    const questionExists = db.prepare("SELECT 1 FROM exam_questions WHERE id = ? AND exam_id = ?").get(questionId, examId);
    if (!questionExists) {
      return res.status(404).json({ error: "Question not found or does not belong to this exam." });
    }

    const optionsJson = JSON.stringify(options || []);

    db.prepare(`
      UPDATE exam_questions
      SET question_text = ?, question_type = ?, options = ?, correct_answer = ?, points = ?
      WHERE id = ? AND exam_id = ?
    `).run(question_text.trim(), question_type, optionsJson, correct_answer.trim(), points || 1, questionId, examId);

    return res.json({
      success: true,
      message: "Exam question updated successfully."
    });
  } catch (err: any) {
    console.error("[UPDATE QUESTION ERR]", err);
    return res.status(500).json({ error: "Failed to updates exam question: " + err.message });
  }
}

// DELETE /api/instructor/exams/:examId - Optional but highly valuable delete exam
export function deleteCourseExam(req: Request, res: Response) {
  const { examId } = req.params;

  try {
    db.prepare("DELETE FROM exams WHERE id = ?").run(examId);

    return res.json({
      success: true,
      message: "Exam deleted successfully."
    });
  } catch (err: any) {
    console.error("[DELETE EXAM ERR]", err);
    return res.status(500).json({ error: "Failed to delete exam: " + err.message });
  }
}

// DELETE /api/instructor/exams/:examId/questions/:questionId - Optional but highly valuable delete question
export function deleteExamQuestion(req: Request, res: Response) {
  const { examId, questionId } = req.params;

  try {
    db.prepare("DELETE FROM exam_questions WHERE id = ? AND exam_id = ?").run(questionId, examId);

    return res.json({
      success: true,
      message: "Exam question deleted successfully."
    });
  } catch (err: any) {
    console.error("[DELETE QUESTION ERR]", err);
    return res.status(500).json({ error: "Failed to delete exam question: " + err.message });
  }
}

