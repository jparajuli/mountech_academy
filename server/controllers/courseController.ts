import { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import db from "../db/database.js";
import { verifyToken } from "../middlewares/auth.js";
import { sendEmail } from "../utils/mailer.js";
import { generateCertificatePDF } from "../services/CertificateService.js";


function getCourseTitle(courseId: string): string {
  try {
    const course = db.prepare("SELECT title FROM courses WHERE id = ?").get(courseId) as { title: string } | undefined;
    if (course && course.title) {
      return course.title;
    }
  } catch (err: any) {
    console.error("Failed to query course title from DB:", err.message);
  }

  const titles: Record<string, string> = {
    "chatgpt-prompt-engineering": "ChatGPT Prompt Engineering for Developers",
    "ai-agentic-design-patterns": "AI Agentic Design Patterns with AutoGen",
    "deep-learning-specialization": "Deep Learning Specialization",
    "ai-python-for-beginners": "AI Python for Beginners",
    "building-systems-chatgpt-api": "Building Systems with the ChatGPT API",
    "practical-rag-vector-databases": "Practical RAG with Vector Databases",
    "generative-ai-with-llms": "Generative AI with Large Language Models",
  };
  return titles[courseId] || "Professional Academy Course";
}

// Serves the academic master handbook
export function getSyllabus(req: Request, res: Response) {
  const pdfBuffer = Buffer.from(
    "%PDF-1.4\n" +
    "1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj\n" +
    "2 0 obj <</Type/Pages/Kids[3 0 R]/Count 1>> endobj\n" +
    "3 0 obj <</Type/Page/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/MediaBox[0 0 595 842]/Contents 5 0 R>> endobj\n" +
    "4 0 obj <</Type/Font/Subtype/Type1/BaseFont/Helvetica>> endobj\n" +
    "5 0 obj <</Length 280>> stream\n" +
    "BT\n" +
    "/F1 20 Tf\n" +
    "50 780 Td\n" +
    "(MOUNTECH ACADEMY LAB COMPANION) Tj\n" +
    "/F1 12 Tf\n" +
    "0 -35 Td\n" +
    "(Official Master Course Syllabus & Sandbox Guidebook) Tj\n" +
    "0 -20 Td\n" +
    "(Academic Verification ID: MT-99228-SECURE) Tj\n" +
    "0 -40 Td\n" +
    "(1. CHATGPT & GEMINI PROMPT ENGINEERING BLUEPRINT) Tj\n" +
    "0 -20 Td\n" +
    "(   - Iterative few-shot models, system configurations, and delimiters) Tj\n" +
    "0 -30 Td\n" +
    "(2. MULTI-AGENT AUTONOMOUS DEBATE & RECURSIVE DEBUGGING) Tj\n" +
    "0 -20 Td\n" +
    "(   - Self-correction runtime logs and user middleware safeguards) Tj\n" +
    "0 -30 Td\n" +
    "(3. MATHEMATICAL DEEP LEARNING GRADIENT MATRIX CALCULUS) Tj\n" +
    "0 -20 Td\n" +
    "(   - Multi-layer neural nodes, backprogation chain rules & Self-Attention) Tj\n" +
    "0 -50 Td\n" +
    "(Nepal Enrollment Partners: Approved via eSewa & Khalti Terminals.) Tj\n" +
    "0 -20 Td\n" +
    "(All rights reserved. Mountech Academy LLC.) Tj\n" +
    "ET\n" +
    "endstream\n" +
    "endobj\n" +
    "xref\n" +
    "0 6\n" +
    "0000000000 65535 f\n" +
    "0000000009 00000 n\n" +
    "0000000058 00000 n\n" +
    "0000000115 00000 n\n" +
    "0000000222 00000 n\n" +
    "0000000293 00000 n\n" +
    "trailer <</Size 6/Root 1 0 R>>\n" +
    "startxref\n" +
    "625\n" +
    "%%EOF"
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="mountech_lab_companion.pdf"');
  return res.send(pdfBuffer);
}

// Get Enrolled Courses list for authenticated user
export async function getEnrollments(req: Request, res: Response) {
  const user = (req as any).user;
  const normalizedEmail = user.email.trim().toLowerCase();

  try {
    const localEnrollments = db.prepare("SELECT * FROM enrollments WHERE email = ? AND (payment_status IS NULL OR payment_status != 'pending')").all(normalizedEmail) as any[];
    const userLocalIDs = localEnrollments.map((e) => e.courseId);
    const userCompletedLocalIDs = localEnrollments.filter((e) => e.status === "Completed").map((e) => e.courseId);

    return res.json({
      enrollments: Array.from(new Set(userLocalIDs)),
      completions: Array.from(new Set(userCompletedLocalIDs)),
      rawEnrollments: localEnrollments,
      sheetsSynced: false
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to fetch registrations: " + error.message });
  }
}

// Enroll in a Course request
export async function enroll(req: Request, res: Response) {
  const user = (req as any).user;
  const { courseId, courseTitle } = req.body;
  const normalizedEmail = user.email.trim().toLowerCase();

  try {
    // 1. Record enrollment in SQLite database
    const alreadyEnrolled = db.prepare(`
      SELECT 1 FROM enrollments WHERE email = ? AND courseId = ?
    `).get(normalizedEmail, courseId);

    if (!alreadyEnrolled) {
      const insertStmt = db.prepare(`
        INSERT INTO enrollments (email, name, courseId, courseTitle, status, timestamp)
        VALUES (?, ?, ?, ?, 'Enrolled', ?)
      `);
      insertStmt.run(normalizedEmail, user.name, courseId, courseTitle, new Date().toISOString());

      // Dispatch automated confirmation email securely using nodemailer helper
      sendEmail(
        normalizedEmail,
        `Enrollment Confirmed: ${courseTitle} 🎓`,
        `
          <div style="font-family: 'Inter', system-ui, sans-serif; padding: 30px; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #0070f3; font-size: 24px; font-weight: 800; margin: 0; font-family: monospace;">MOUNTECH ACADEMY</h1>
              <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; tracking-wider: 1px; margin: 5px 0 0 0;">Interactive Technology Certifications</p>
            </div>
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin-bottom: 20px;" />
            <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin-top: 0;">Enrollment Registration Success!</h2>
            <p>Dear <strong>${user.name}</strong>,</p>
            <p>Congratulations! Your academic registration has been received successfully. You have unlocked live access to the following classroom:</p>
            
            <div style="background: #f0f7ff; border-left: 4px solid #0070f3; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <strong style="font-size: 15px; color: #0050b3;">${courseTitle}</strong><br/>
              <span style="font-size: 11px; color: #6b7280; font-family: monospace; font-weight: 600;">Track Code: ${courseId}</span>
            </div>

            <p style="font-size: 13px; color: #4b5563;">
              To start attending sessions, access study materials uploaded by your course instructors, and complete assignments, visit the course page of your Scholar Catalog dashboard.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 25px 0;" />
            <p style="font-size: 11px; color: #9ca3af; line-height: 1.4; margin: 0;">
              This email was sent from an automated transactional mailing server. Replies to this address are not monitored.
            </p>
          </div>
        `
      ).catch(err => {
        console.error("[SMTP_CONFIRMATION_FAIL] Failed sending confirmation message:", err.message);
      });
    }

    return res.json({
      success: true,
      sheetsSynced: false,
      message: "Enrolled in local session successfully."
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to enroll: " + error.message });
  }
}

// Create Course Completion Request
export async function complete(req: Request, res: Response) {
  const user = (req as any).user;
  const { courseId } = req.body;
  const normalizedEmail = user.email.trim().toLowerCase();

  try {
    // 1. Mark in SQLite database
    const existing = db.prepare("SELECT id FROM enrollments WHERE email = ? AND courseId = ?").get(normalizedEmail, courseId);

    if (existing) {
      db.prepare("UPDATE enrollments SET status = 'Completed' WHERE email = ? AND courseId = ?").run(normalizedEmail, courseId);
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO enrollments (email, name, courseId, courseTitle, status, timestamp)
        VALUES (?, ?, ?, ?, 'Completed', ?)
      `);
      insertStmt.run(normalizedEmail, user.name, courseId, getCourseTitle(courseId), new Date().toISOString());
    }

    return res.json({
      success: true,
      sheetsSynced: false,
      message: "Successfully completed course locally."
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to complete course: " + error.message });
  }
}

// Download dynamic completion certificate
export async function certificateDownload(req: Request, res: Response) {
  // Query token verification fallback
  const authHeader = req.headers.authorization;
  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).send("<h1>Unauthorized</h1><p>Invalid or missing authentication credentials.</p>");
  }

  const courseId = (req.params.courseId || req.query.courseId) as string;
  if (!courseId) {
    return res.status(400).send("<h1>Bad Request</h1><p>Missing required courseId query parameter.</p>");
  }

  // Certificate Security: Verify the student has successfully passed an exam of type 'final' for this course
  try {
    const passedFinal = db.prepare(`
      SELECT 1 
      FROM exam_attempts ea
      JOIN exams e ON ea.exam_id = e.id
      WHERE e.course_id = ? AND e.exam_type = 'final' AND ea.passed = 1 AND LOWER(ea.user_id) = ?
      LIMIT 1
    `).get(courseId, payload.email.trim().toLowerCase());

    if (!passedFinal) {
      return res.status(403).json({ error: "Certificate locked. You must pass the Final Exam to earn this certificate." });
    }
  } catch (err: any) {
    console.error("Certificate gate verification error:", err.message);
    return res.status(403).json({ error: "Certificate locked. You must pass the Final Exam to earn this certificate." });
  }

  const courseTitle = getCourseTitle(courseId);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  // Check the enrollments table for the certificate_downloaded_at timestamp
  try {
    const enrollment = db.prepare(`
      SELECT certificate_downloaded_at 
      FROM enrollments 
      WHERE LOWER(email) = ? AND courseId = ?
    `).get(payload.email.trim().toLowerCase(), courseId) as { certificate_downloaded_at: string | null } | undefined;

    if (enrollment && enrollment.certificate_downloaded_at && req.query.confirm !== "true") {
      return res.status(409).json({
        alreadyDownloaded: true,
        downloadedAt: enrollment.certificate_downloaded_at,
        message: "Certificate already downloaded."
      });
    }
  } catch (dbErr: any) {
    console.error("Failed to check pre-downloaded certificate timestamp:", dbErr.message);
  }

  try {
    // Interceptor: execute UPDATE to set certificate_downloaded_at = datetime('now') ONLY if previously null
    try {
      db.prepare(`
        UPDATE enrollments 
        SET certificate_downloaded_at = datetime('now')
        WHERE LOWER(email) = ? AND courseId = ? AND certificate_downloaded_at IS NULL
      `).run(payload.email.trim().toLowerCase(), courseId);
    } catch (eErr: any) {
      console.error("Backend interceptor warning: Failed to save certificate download timestamp:", eErr.message);
    }

    const certBuffer = await generateCertificatePDF(payload.name, courseTitle, dateStr);
    const safeFilename = `${courseId}_completion_certificate.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    return res.send(certBuffer);
  } catch (err: any) {
    console.error("Certificate PDF generation error:", err.message);
    return res.status(500).send(`<h1>Generation Error</h1><p>${err.message}</p>`);
  }
}

// Get course average rating and list
export function getRatings(req: Request, res: Response) {
  const { courseId } = req.params;

  try {
    const courseRatings = db.prepare("SELECT * FROM ratings WHERE courseId = ? ORDER BY timestamp DESC").all(courseId) as any[];
    const count = courseRatings.length;
    const average = count > 0 
      ? Math.round((courseRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    return res.json({
      ratings: courseRatings,
      average,
      count
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to read rating reviews: " + err.message });
  }
}

// Submit a star rating for a course
export function submitRating(req: Request, res: Response) {
  const user = (req as any).user;
  const { courseId, rating, review } = req.body;
  const normalizedEmail = user.email.trim().toLowerCase();

  try {
    // Check if the user already submitted a rating for this course
    const existing = db.prepare("SELECT id FROM ratings WHERE courseId = ? AND email = ?").get(courseId, normalizedEmail) as any;
    const ratingId = existing ? existing.id : crypto.randomBytes(8).toString("hex");

    const newRating = {
      id: ratingId,
      courseId,
      email: normalizedEmail,
      name: user.name,
      rating,
      review: (review || "").trim(),
      timestamp: new Date().toISOString()
    };

    db.prepare(`
      INSERT OR REPLACE INTO ratings (id, courseId, email, name, rating, review, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      newRating.id,
      newRating.courseId,
      newRating.email,
      newRating.name,
      newRating.rating,
      newRating.review,
      newRating.timestamp
    );

    return res.json({
      success: true,
      message: "Thank you! Your rating has been recorded successfully.",
      rating: newRating
    });
  } catch (err: any) {
    console.error("[SUBMIT RATING ERR]", err);
    return res.status(500).json({ error: "Failed to record star review: " + err.message });
  }
}

// List all courses from database (Public: returned where is_locked = 0 only)
export function listCourses(req: Request, res: Response) {
  try {
    const rows = db.prepare(`
      SELECT c.*,
             (SELECT name FROM users WHERE users.email = c.syllabus_last_updated_by) AS syllabus_last_updated_by_name,
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
      WHERE c.is_locked = 0
      GROUP BY c.id
    `).all() as any[];
    const courses = rows.map((r) => {
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
        syllabus_content: r.syllabus_content,
        syllabus_last_updated_at: r.syllabus_last_updated_at,
        syllabus_last_updated_by: r.syllabus_last_updated_by,
        syllabus_last_updated_by_name: r.syllabus_last_updated_by_name,
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
    console.error("[GET COURSES ERR]", err);
    return res.status(500).json({ error: "Failed to retrieve courses database index: " + err.message });
  }
}

// List all courses for Admin (Returns all courses including locked ones)
export function listAdminCourses(req: Request, res: Response) {
  try {
    const rows = db.prepare(`
      SELECT c.*,
             (SELECT name FROM users WHERE users.email = c.syllabus_last_updated_by) AS syllabus_last_updated_by_name,
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
    const courses = rows.map((r) => {
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
        syllabus_content: r.syllabus_content,
        syllabus_last_updated_at: r.syllabus_last_updated_at,
        syllabus_last_updated_by: r.syllabus_last_updated_by,
        syllabus_last_updated_by_name: r.syllabus_last_updated_by_name,
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
    console.error("[GET ADMIN COURSES ERR]", err);
    return res.status(500).json({ error: "Failed to retrieve admin courses: " + err.message });
  }
}

// PUT /api/courses/:courseId/syllabus - Shared Syllabus editing controller
export function updateSharedSyllabus(req: Request, res: Response) {
  const { courseId } = req.params;
  const { syllabus_content, syllabus, clientLastUpdatedAt } = req.body;
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized access: login required." });
  }

  try {
    const courseRecord = db.prepare("SELECT syllabus_last_updated_at FROM courses WHERE id = ?").get(courseId) as any;
    if (!courseRecord) {
      return res.status(404).json({ error: "Target course record not found." });
    }

    const dbLastUpdatedAt = courseRecord.syllabus_last_updated_at;

    if (dbLastUpdatedAt) {
      // Compare DB timestamp against the clientLastUpdatedAt timestamp.
      // If clientLastUpdatedAt is missing or is helper timestamp strictly less than database, trigger conflict
      const isConflict = !clientLastUpdatedAt || new Date(dbLastUpdatedAt).getTime() > new Date(clientLastUpdatedAt).getTime();
      
      if (isConflict) {
        return res.status(409).json({ 
          error: "Conflict: Another user has updated this syllabus since you opened it.",
          code: "CONCURRENCY_CONFLICT",
          dbLastUpdatedAt
        });
      }
    }

    // Retrieve user database identifier (email)
    let userId = user.email;

    const lastUpdatedInstant = new Date().toISOString();

    if (syllabus && Array.isArray(syllabus)) {
      db.prepare(`
        UPDATE courses 
        SET syllabus_content = ?, 
            syllabus = ?,
            syllabus_last_updated_at = ?, 
            syllabus_last_updated_by = ? 
        WHERE id = ?
      `).run(syllabus_content || "", JSON.stringify(syllabus), lastUpdatedInstant, userId, courseId);
    } else {
      db.prepare(`
        UPDATE courses 
        SET syllabus_content = ?, 
            syllabus_last_updated_at = ?, 
            syllabus_last_updated_by = ? 
        WHERE id = ?
      `).run(syllabus_content || "", lastUpdatedInstant, userId, courseId);
    }

    // Retrieve the user name of the updater to render in the client directly
    const updaterName = user.name || "Unknown Author";

    return res.json({
      success: true,
      message: "Academic course syllabus unified successfully.",
      syllabus_content,
      syllabus_last_updated_at: lastUpdatedInstant,
      syllabus_last_updated_by: userId,
      syllabus_last_updated_by_name: updaterName
    });
  } catch (err: any) {
    console.error("[SHARED SYLLABUS EDIT ERR]", err);
    return res.status(500).json({ error: "Failed to update unified syllabus node: " + err.message });
  }
}

// Update an existing course
export function updateCourse(req: Request, res: Response) {
  const { id } = req.params;
  const {
    title,
    type,
    difficulty,
    topic,
    description,
    fullDescription,
    instructorName,
    instructorTitle,
    duration,
    lessonCount,
    partnerName,
    skillsAcquired,
    requirements,
    syllabus,
    thumbnailBg,
    thumbnailIconCode,
    isPaid,
    price,
    instructor_ids
  } = req.body;

  try {
    const existing = db.prepare("SELECT 1 FROM courses WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }

    const resolvedInstructorIds = Array.isArray(instructor_ids)
      ? instructor_ids.filter((x): x is string | number => x !== null && x !== undefined && x !== "")
      : [];

    let finalInstructorName = (instructorName || "").trim();
    let finalInstructorTitle = (instructorTitle || "").trim();

    if (resolvedInstructorIds.length > 0) {
      const primaryProfile = db.prepare("SELECT full_name, academic_title FROM instructor_profiles WHERE id = ?").get(Number(resolvedInstructorIds[0])) as any;
      if (primaryProfile) {
        finalInstructorName = primaryProfile.full_name;
        finalInstructorTitle = primaryProfile.academic_title;
      }
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE courses SET
          title = ?,
          type = ?,
          difficulty = ?,
          topic = ?,
          description = ?,
          fullDescription = ?,
          instructorName = ?,
          instructorTitle = ?,
          duration = ?,
          lessonCount = ?,
          partnerName = ?,
          skillsAcquired = ?,
          requirements = ?,
          syllabus = ?,
          thumbnailBg = ?,
          thumbnailIconCode = ?,
          isPaid = ?,
          price = ?,
          instructor_profile_id = NULL
        WHERE id = ?
      `).run(
        title.trim(),
        type,
        difficulty,
        topic,
        description.trim(),
        fullDescription.trim(),
        finalInstructorName,
        finalInstructorTitle,
        duration,
        lessonCount,
        partnerName ? partnerName.trim() : null,
        JSON.stringify(skillsAcquired || []),
        JSON.stringify(requirements || []),
        JSON.stringify(syllabus || []),
        thumbnailBg,
        thumbnailIconCode,
        isPaid ? 1 : 0,
        price ? Number(price) : 0,
        id
      );

      db.prepare("DELETE FROM course_instructors WHERE course_id = ?").run(id);

      const insertCI = db.prepare(`
        INSERT INTO course_instructors (course_id, instructor_profile_id, display_order)
        VALUES (?, ?, ?)
      `);

      for (let i = 0; i < resolvedInstructorIds.length; i++) {
        insertCI.run(id, Number(resolvedInstructorIds[i]), i);
      }
    })();

    const updatedRow = db.prepare(`
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
      WHERE c.id = ?
      GROUP BY c.id
    `).get(id) as any;

    let instructors: any[] = [];
    try {
      const parsed = JSON.parse(updatedRow.instructors_json);
      if (Array.isArray(parsed)) {
        instructors = parsed.filter((inst: any) => inst && inst.id !== null);
        instructors.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      }
    } catch (err) {
      instructors = [];
    }

    const primaryInst = instructors[0] || null;

    const updatedCourse = {
      id: updatedRow.id,
      title: updatedRow.title,
      type: updatedRow.type,
      difficulty: updatedRow.difficulty,
      topic: updatedRow.topic,
      description: updatedRow.description,
      fullDescription: updatedRow.fullDescription,
      instructorName: primaryInst ? primaryInst.name : updatedRow.instructorName,
      instructorTitle: primaryInst ? primaryInst.title : updatedRow.instructorTitle,
      duration: updatedRow.duration,
      lessonCount: updatedRow.lessonCount,
      rating: updatedRow.rating,
      enrolledCount: updatedRow.enrolledCount,
      partnerName: updatedRow.partnerName,
      skillsAcquired: JSON.parse(updatedRow.skillsAcquired || "[]"),
      requirements: JSON.parse(updatedRow.requirements || "[]"),
      syllabus: JSON.parse(updatedRow.syllabus || "[]"),
      thumbnailBg: updatedRow.thumbnailBg,
      thumbnailIconCode: updatedRow.thumbnailIconCode,
      isPaid: updatedRow.isPaid === 1,
      price: updatedRow.price,
      isLocked: updatedRow.is_locked === 1,
      instructors: instructors.map(i => ({ id: i.id, name: i.name, title: i.title, avatar: i.avatar })),
      instructor: primaryInst ? {
        name: primaryInst.name,
        title: primaryInst.title,
        avatar: primaryInst.avatar
      } : null
    };

    return res.json({
      success: true,
      message: `Course "${title}" successfully updated.`,
      course: updatedCourse
    });
  } catch (err: any) {
    console.error("[UPDATE COURSE ERR]", err);
    return res.status(500).json({ error: "Failed to update course: " + err.message });
  }
}

// Toggle course locked status (Patch id/lock)
export function toggleCourseLock(req: Request, res: Response) {
  const { id } = req.params;
  const { isLocked } = req.body || {};

  try {
    const course = db.prepare("SELECT title, is_locked FROM courses WHERE id = ?").get(id) as any;
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    let targetLock: number;
    if (typeof isLocked === "boolean") {
      targetLock = isLocked ? 1 : 0;
    } else {
      // Toggle if no explicit boolean provided
      targetLock = course.is_locked === 1 ? 0 : 1;
    }

    db.prepare("UPDATE courses SET is_locked = ? WHERE id = ?").run(targetLock, id);

    return res.json({
      success: true,
      message: `Course "${course.title}" lock status updated.`,
      isLocked: targetLock === 1
    });
  } catch (err: any) {
    console.error("[TOGGLE LOCK ERR]", err);
    return res.status(500).json({ error: "Failed to update course lock state: " + err.message });
  }
}

// Create a new course and content from the frontend
export function createCourse(req: Request, res: Response) {
  const user = (req as any).user;
  const {
    title,
    type,
    difficulty,
    topic,
    description,
    fullDescription,
    instructorName,
    instructorTitle,
    duration,
    lessonCount,
    partnerName,
    skillsAcquired,
    requirements,
    syllabus,
    thumbnailBg,
    thumbnailIconCode,
    isPaid,
    price,
    instructor_ids
  } = req.body;

  if (!title || !description || !fullDescription) {
    return res.status(400).json({ error: "Missing required core course parameters (title, description, fullDescription)." });
  }

  try {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    
    // Check if distinct course ID is already taken
    let targetId = slug;
    const existing = db.prepare("SELECT id FROM courses WHERE id = ?").get(targetId);
    if (existing) {
      targetId = `${slug}-${Math.random().toString(36).substring(2, 5)}`;
    }

    const resolvedInstructorIds = Array.isArray(instructor_ids)
      ? instructor_ids.filter((x): x is string | number => x !== null && x !== undefined && x !== "")
      : [];

    let finalInstructorName = (instructorName || user?.name || "Academic Facilitator").trim();
    let finalInstructorTitle = (instructorTitle || "Mountech Certification Board Member").trim();

    if (resolvedInstructorIds.length > 0) {
      const primaryProfile = db.prepare("SELECT full_name, academic_title FROM instructor_profiles WHERE id = ?").get(Number(resolvedInstructorIds[0])) as any;
      if (primaryProfile) {
        finalInstructorName = primaryProfile.full_name;
        finalInstructorTitle = primaryProfile.academic_title;
      }
    }

    const courseRecord = {
      id: targetId,
      title: title.trim(),
      type: type || 'Short Course',
      difficulty: difficulty || 'Beginner',
      topic: topic || 'AI Essentials',
      description: description.trim(),
      fullDescription: fullDescription.trim(),
      instructorName: finalInstructorName,
      instructorTitle: finalInstructorTitle,
      duration: duration || "2 hours",
      lessonCount: lessonCount || "5 lessons",
      rating: 4.8,
      enrolledCount: "10+ students",
      partnerName: partnerName ? partnerName.trim() : "Mountech Academy",
      skillsAcquired: Array.isArray(skillsAcquired) ? skillsAcquired : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      syllabus: Array.isArray(syllabus) ? syllabus : [],
      thumbnailBg: thumbnailBg || "bg-slate-900 text-slate-100",
      thumbnailIconCode: thumbnailIconCode || "default",
      isPaid: isPaid ? 1 : 0,
      price: price ? Number(price) : 0
    };

    db.transaction(() => {
      db.prepare(`
        INSERT INTO courses (
          id, title, type, difficulty, topic, description, fullDescription,
          instructorName, instructorTitle, duration, lessonCount, rating, enrolledCount,
          partnerName, skillsAcquired, requirements, syllabus, thumbnailBg, thumbnailIconCode, isPaid, price, instructor_profile_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `).run(
        courseRecord.id,
        courseRecord.title,
        courseRecord.type,
        courseRecord.difficulty,
        courseRecord.topic,
        courseRecord.description,
        courseRecord.fullDescription,
        courseRecord.instructorName,
        courseRecord.instructorTitle,
        courseRecord.duration,
        courseRecord.lessonCount,
        courseRecord.rating,
        courseRecord.enrolledCount,
        courseRecord.partnerName,
        JSON.stringify(courseRecord.skillsAcquired),
        JSON.stringify(courseRecord.requirements),
        JSON.stringify(courseRecord.syllabus),
        courseRecord.thumbnailBg,
        courseRecord.thumbnailIconCode,
        courseRecord.isPaid,
        courseRecord.price
      );

      const insertCI = db.prepare(`
        INSERT INTO course_instructors (course_id, instructor_profile_id, display_order)
        VALUES (?, ?, ?)
      `);

      for (let i = 0; i < resolvedInstructorIds.length; i++) {
        insertCI.run(courseRecord.id, Number(resolvedInstructorIds[i]), i);
      }
    })();

    console.log(`[COURSE CREATED] Course "${courseRecord.title}" successfully persisted in SQLite with ID: ${courseRecord.id}`);

    const createdRow = db.prepare(`
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
      WHERE c.id = ?
      GROUP BY c.id
    `).get(courseRecord.id) as any;

    let instructors: any[] = [];
    try {
      const parsed = JSON.parse(createdRow.instructors_json);
      if (Array.isArray(parsed)) {
        instructors = parsed.filter((inst: any) => inst && inst.id !== null);
        instructors.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      }
    } catch (err) {
      instructors = [];
    }

    const primaryInst = instructors[0] || null;

    const returnedCourse = {
      id: createdRow.id,
      title: createdRow.title,
      type: createdRow.type,
      difficulty: createdRow.difficulty,
      topic: createdRow.topic,
      description: createdRow.description,
      fullDescription: createdRow.fullDescription,
      instructorName: primaryInst ? primaryInst.name : createdRow.instructorName,
      instructorTitle: primaryInst ? primaryInst.title : createdRow.instructorTitle,
      duration: createdRow.duration,
      lessonCount: createdRow.lessonCount,
      rating: createdRow.rating,
      enrolledCount: createdRow.enrolledCount,
      partnerName: createdRow.partnerName,
      skillsAcquired: JSON.parse(createdRow.skillsAcquired || "[]"),
      requirements: JSON.parse(createdRow.requirements || "[]"),
      syllabus: JSON.parse(createdRow.syllabus || "[]"),
      thumbnailBg: createdRow.thumbnailBg,
      thumbnailIconCode: createdRow.thumbnailIconCode,
      isPaid: createdRow.isPaid === 1,
      price: createdRow.price,
      isLocked: createdRow.is_locked === 1,
      instructors: instructors.map(i => ({ id: i.id, name: i.name, title: i.title, avatar: i.avatar })),
      instructor: primaryInst ? {
        name: primaryInst.name,
        title: primaryInst.title,
        avatar: primaryInst.avatar
      } : null
    };

    return res.status(201).json({
      success: true,
      message: `Course "${courseRecord.title}" successfully initialized and created.`,
      course: returnedCourse
    });
  } catch (err: any) {
    console.error("[CREATE COURSE DB ERR]", err);
    return res.status(500).json({ error: "Failed to persist new course: " + err.message });
  }
}

// Phase 2: Live Session Controllers
export function createLiveSession(req: Request, res: Response) {
  const { courseId } = req.params;
  const { title, start_time, end_time, scheduled_start_time, is_live_scheduled } = req.body;

  try {
    const course = db.prepare("SELECT title FROM courses WHERE id = ?").get(courseId) as { title: string } | undefined;
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const scheduledTime = scheduled_start_time || start_time;
    const isLive = is_live_scheduled !== false ? 1 : 0;

    const result = db.prepare(`
      INSERT INTO live_sessions (course_id, title, start_time, end_time, scheduled_start_time, is_live_scheduled)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(courseId, title.trim(), start_time, end_time, scheduledTime, isLive);

    return res.status(201).json({
      success: true,
      message: `Live class scheduled for "${course.title}" successfully.`,
      session: {
        id: result.lastInsertRowid,
        course_id: courseId,
        title: title.trim(),
        start_time,
        end_time,
        scheduled_start_time: scheduledTime,
        is_live_scheduled: !!isLive
      }
    });
  } catch (err: any) {
    console.error("[CREATE LIVE SESSION ERR]", err);
    return res.status(500).json({ error: "Failed to schedule live class: " + err.message });
  }
}

export function listLiveSessions(req: Request, res: Response) {
  const { courseId } = req.params;

  try {
    const sessions = db.prepare(`
      SELECT id, course_id, title, start_time, end_time, scheduled_start_time, is_live_scheduled FROM live_sessions
      WHERE course_id = ?
      ORDER BY datetime(start_time) ASC
    `).all(courseId) as any[];

    return res.json({
      success: true,
      sessions: sessions.map(s => ({
        ...s,
        is_live_scheduled: !!s.is_live_scheduled
      }))
    });
  } catch (err: any) {
    console.error("[GET LIVE SESSIONS ERR]", err);
    return res.status(500).json({ error: "Failed to retrieve live sessions: " + err.message });
  }
}

export function joinLiveSession(req: Request, res: Response) {
  const user = (req as any).user;
  const { sessionId } = req.params;
  const normalizedEmail = user.email.trim().toLowerCase();

  try {
    const session = db.prepare("SELECT * FROM live_sessions WHERE id = ?").get(sessionId) as any;
    if (!session) {
      return res.status(404).json({ error: "Scheduled live session not found." });
    }

    if (user.role !== "admin") {
      const isEnrolled = db.prepare(`
        SELECT 1 FROM enrollments WHERE email = ? AND courseId = ? AND (payment_status IS NULL OR payment_status != 'pending')
      `).get(normalizedEmail, session.course_id);

      if (!isEnrolled) {
        return res.status(403).json({ error: "Access Denied: You must be registered in this course to join the live session." });
      }
    }

    const startEpoch = new Date(session.start_time).getTime();
    const endEpoch = new Date(session.end_time).getTime();
    const currentEpoch = Date.now();
    const joinWindowStart = startEpoch - (5 * 60 * 1000); // 5 minutes cushion

    if (currentEpoch < joinWindowStart) {
      const minsDiff = Math.ceil((joinWindowStart - currentEpoch) / 60000);
      return res.status(403).json({
        error: `Meeting is locked. The classroom opens exactly 5 minutes before start: ready in ${minsDiff} minutes.`,
        readyInMs: joinWindowStart - currentEpoch
      });
    }

    if (currentEpoch > endEpoch) {
      return res.status(403).json({ error: "Forbidden: This scheduled live classroom session has already ended." });
    }

    const generatedJitsiUrl = `https://meet.jit.si/MountechAcademy-LiveClass-${session.id || session.course_id}`;

    if (req.headers.accept?.includes("text/html") || req.query.redirect === "true") {
      return res.redirect(generatedJitsiUrl);
    }

    return res.json({
      success: true,
      meetUrl: generatedJitsiUrl
    });
  } catch (err: any) {
    console.error("[JOIN LIVE SESSION GATEKEEPER ERR]", err);
    return res.status(500).json({ error: "Gatekeeper check failed: " + err.message });
  }
}

// GET /api/courses/:courseId/student-exams - List published exams for student in a course
export function getCourseExamsForStudent(req: Request, res: Response) {
  const { courseId } = req.params;
  const user = (req as any).user;
  const email = user.email.trim().toLowerCase();

  try {
    // Check enrollment
    const enrollment = db.prepare(`
      SELECT 1 FROM enrollments WHERE email = ? AND courseId = ? AND (payment_status IS NULL OR payment_status != 'pending')
    `).get(email, courseId);

    if (!enrollment && user.role !== "admin") {
      return res.status(403).json({ error: "Access Denied: You must be enrolled in this course to view exams." });
    }

    const exams = db.prepare(`
      SELECT id, course_id, title, description, questions_to_display, passing_score_percentage, duration_minutes, exam_type, lesson_reference, lesson_id 
      FROM exams 
      WHERE course_id = ? AND is_published = 1
    `).all(courseId) as any[];

    // For each exam, attach the student's highest score attempt if any
    const examsWithAttempts = exams.map(exam => {
      const attempts = db.prepare(`
        SELECT id, score, passed, started_at, completed_at 
        FROM exam_attempts 
        WHERE exam_id = ? AND LOWER(user_id) = ? 
        ORDER BY completed_at DESC, id DESC
      `).all(exam.id, email) as any[];

      const passed = attempts.some(a => a.passed === 1);
      const bestAttempt = attempts.reduce((best, current) => {
        if (!current.completed_at) return best;
        if (!best) return current;
        return (current.score || 0) > (best.score || 0) ? current : best;
      }, null as any);

      // Determine isLocked progression logic
      let isLocked = false;
      if (exam.exam_type === 'final') {
        // Final Exam is locked if there are ANY lesson-type exams in this course that is published and the student lacks a passing attempt (passed = 1)
        const lessonExams = db.prepare(`
          SELECT id FROM exams WHERE course_id = ? AND exam_type = 'lesson' AND is_published = 1
        `).all(courseId) as { id: number }[];

        for (const le of lessonExams) {
          const passCheck = db.prepare(`
            SELECT 1 FROM exam_attempts WHERE exam_id = ? AND LOWER(user_id) = ? AND passed = 1 LIMIT 1
          `).get(le.id, email);
          if (!passCheck) {
            isLocked = true;
            break;
          }
        }
      } else if (exam.exam_type === 'lesson' && exam.lesson_id) {
        // Sequentially lock lessons: if the developer has preceding lesson and the preceding lesson's quiz is not passed
        const currentLesson = db.prepare(`
          SELECT order_index FROM lessons WHERE id = ?
        `).get(exam.lesson_id) as { order_index: number } | undefined;

        if (currentLesson && currentLesson.order_index > 1) {
          const prevLesson = db.prepare(`
            SELECT id FROM lessons WHERE course_id = ? AND order_index = ?
          `).get(courseId, currentLesson.order_index - 1) as { id: number } | undefined;

          if (prevLesson) {
            const prevLessonExams = db.prepare(`
              SELECT id FROM exams WHERE course_id = ? AND exam_type = 'lesson' AND lesson_id = ? AND is_published = 1
            `).all(courseId, prevLesson.id) as { id: number }[];

            for (const prevEx of prevLessonExams) {
              const passCheck = db.prepare(`
                SELECT 1 FROM exam_attempts WHERE exam_id = ? AND LOWER(user_id) = ? AND passed = 1 LIMIT 1
              `).get(prevEx.id, email);
              if (!passCheck) {
                isLocked = true;
                break;
              }
            }
          }
        }
      }

      return {
        ...exam,
        attempts,
        passed,
        bestAttempt,
        isLocked
      };
    });

    return res.json({
      success: true,
      exams: examsWithAttempts
    });
  } catch (err: any) {
    console.error("[GET STUDENT EXAMS ERR]", err);
    return res.status(500).json({ error: "Failed to retrieve student exams: " + err.message });
  }
}

// GET /api/courses/:courseId/lessons - List lessons for a student with isLocked calculated
export function getCourseLessonsForStudent(req: Request, res: Response) {
  const { courseId } = req.params;
  const user = (req as any).user;
  const email = user.email.trim().toLowerCase();

  try {
    // Check enrollment
    const enrollment = db.prepare(`
      SELECT 1 FROM enrollments WHERE email = ? AND courseId = ? AND (payment_status IS NULL OR payment_status != 'pending')
    `).get(email, courseId);

    if (!enrollment && user.role !== "admin") {
      return res.status(403).json({ error: "Access Denied: You must be enrolled in this course to view syllabus progression." });
    }

    const lessons = db.prepare(`
      SELECT id, course_id, chapter, title, description, order_index, youtube_channel_id, is_chosen_for_recording
      FROM lessons
      WHERE course_id = ?
      ORDER BY order_index ASC
    `).all(courseId) as any[];

    const lessonsWithStatus = lessons.map((lesson, idx) => {
      if (idx === 0) {
        return { ...lesson, isLocked: false };
      }

      const prevLesson = lessons[idx - 1];
      const prevLessonExams = db.prepare(`
        SELECT id FROM exams WHERE course_id = ? AND exam_type = 'lesson' AND lesson_id = ? AND is_published = 1
      `).all(courseId, prevLesson.id) as any[];

      let isLocked = false;
      if (prevLessonExams.length > 0) {
        for (const exam of prevLessonExams) {
          const attempt = db.prepare(`
            SELECT 1 FROM exam_attempts
            WHERE exam_id = ? AND LOWER(user_id) = ? AND passed = 1
            LIMIT 1
          `).get(exam.id, email);

          if (!attempt) {
            isLocked = true;
            break;
          }
        }
      }

      return {
        ...lesson,
        isLocked
      };
    });

    return res.json({
      success: true,
      lessons: lessonsWithStatus
    });
  } catch (err: any) {
    console.error("[GET SYLLABUS LESSONS ERR]", err);
    return res.status(500).json({ error: "Failed to load syllabus lessons: " + err.message });
  }
}

// POST /api/courses/:courseId/exams/:examId/start - Start a student exam
export function startStudentExam(req: Request, res: Response) {
  const { courseId, examId } = req.params;
  const user = (req as any).user;
  const email = user.email.trim().toLowerCase();

  try {
    // 1. Verify enrollment
    const enrollment = db.prepare(`
      SELECT 1 FROM enrollments WHERE email = ? AND courseId = ? AND (payment_status IS NULL OR payment_status != 'pending')
    `).get(email, courseId);

    if (!enrollment && user.role !== "admin") {
      return res.status(403).json({ error: "Access Denied: You must be enrolled in this course to take this exam." });
    }

    // 2. Fetch exam and verify it exists & is published
    const exam = db.prepare(`
      SELECT id, title, description, questions_to_display, passing_score_percentage, is_published, duration_minutes, chapter_id
      FROM exams
      WHERE id = ? AND course_id = ?
    `).get(examId, courseId) as any;

    if (!exam) {
      return res.status(404).json({ error: "Exam not found or does not belong to this course." });
    }

    if (exam.is_published !== 1 && user.role !== "admin") {
      return res.status(403).json({ error: "Access Denied: This exam is not currently published." });
    }

    // A. 3-Hour Cooldown restriction for course final exams/generic exams (where chapter_id is null, empty string or 'final')
    const isFinalExam = !exam.chapter_id || exam.chapter_id === 'final' || exam.chapter_id === '';
    if (isFinalExam && user.role !== "admin") {
      const lastAttempt = db.prepare(`
        SELECT started_at, completed_at 
        FROM exam_attempts 
        WHERE exam_id = ? AND user_id = ? 
        ORDER BY id DESC LIMIT 1
      `).get(Number(examId), email) as any;

      if (lastAttempt) {
        const lastTimeStr = lastAttempt.completed_at || lastAttempt.started_at;
        const lastTime = new Date(lastTimeStr).getTime();
        const now = Date.now();
        const cooldownMs = 3 * 60 * 60 * 1000;
        if (now - lastTime < cooldownMs) {
          const remainingMs = cooldownMs - (now - lastTime);
          const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
          const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          const remainingSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
          return res.status(403).json({
            error: `Final Exam Cooldown active. Please wait ${remainingHours}h ${remainingMinutes}m ${remainingSeconds}s before starting your next retake node.`
          });
        }
      }
    }

    // B. Requisite Checks for syllabus chapters completed
    const course = db.prepare("SELECT syllabus FROM courses WHERE id = ?").get(courseId) as any;
    if (course) {
      try {
        const syllabus = JSON.parse(course.syllabus || "[]") as { chapter: string; title: string }[];
        let targetIndex = syllabus.length;
        if (!isFinalExam) {
          const matchIndex = syllabus.findIndex(
            item => item.chapter && item.chapter.trim().toLowerCase() === exam.chapter_id.trim().toLowerCase()
          );
          if (matchIndex !== -1) {
            targetIndex = matchIndex + 1;
          }
        }

        if (targetIndex > 0) {
          const completedIndices = req.body.completedLessons || [];
          const missingChapters = [];
          for (let i = 0; i < targetIndex; i++) {
            if (!completedIndices.includes(i)) {
              missingChapters.push(syllabus[i].chapter || `Unit ${i + 1}`);
            }
          }

          if (missingChapters.length > 0 && user.role !== "admin") {
            return res.status(403).json({
              error: `Prerequisite Locked: In order to take this chapter assessment, you must first review and mark all preceding modules as completed. Missing: ${missingChapters.join(', ')}`
            });
          }
        }
      } catch (syllabusError) {
        console.error("Syllabus parse error:", syllabusError);
      }
    }

    // 3. Create exam attempt in database
    const insertAttempt = db.prepare(`
      INSERT INTO exam_attempts (exam_id, user_id, score, passed, started_at)
      VALUES (?, ?, NULL, NULL, datetime('now'))
    `).run(Number(examId), email);

    const attemptId = insertAttempt.lastInsertRowid;

    // 4. Query random subset of questions
    const limitCount = exam.questions_to_display || 5;
    const questions = db.prepare(`
      SELECT id, question_text, question_type, options, points 
      FROM exam_questions 
      WHERE exam_id = ? 
      ORDER BY RANDOM() 
      LIMIT ?
    `).all(Number(examId), limitCount) as any[];

    // 5. Structure/Parse questions block (JSON options and stripping answer for security)
    const secureQuestions = questions.map(q => {
      let parsedOptions = [];
      try {
        parsedOptions = typeof q.options === "string" ? JSON.parse(q.options) : q.options || [];
      } catch (e) {
        parsedOptions = [];
      }
      return {
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: parsedOptions,
        points: q.points
      };
    });

    return res.json({
      success: true,
      message: "Exam attempt started successfully.",
      attemptId,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        questions_to_display: exam.questions_to_display,
        passing_score_percentage: exam.passing_score_percentage,
        duration_minutes: exam.duration_minutes
      },
      questions: secureQuestions
    });
  } catch (err: any) {
    console.error("[START STUDENT EXAM ERR]", err);
    return res.status(500).json({ error: "Failed to initiate exam: " + err.message });
  }
}

// POST /api/attempts/:attemptId/submit - Grade and save exam results
export function submitStudentExamResponse(req: Request, res: Response) {
  const { attemptId } = req.params;
  const { answers } = req.body; // Expects array: [{ questionId: number, answer: string }] 
  const user = (req as any).user;
  const email = user.email.trim().toLowerCase();

  try {
    // 1. Retrieve & verify attempt
    const attempt = db.prepare(`
      SELECT * FROM exam_attempts WHERE id = ?
    `).get(Number(attemptId)) as any;

    if (!attempt) {
      return res.status(404).json({ error: "Exam attempt not found." });
    }

    if (attempt.user_id.toLowerCase() !== email && user.role !== "admin") {
      return res.status(403).json({ error: "Access Denied: You do not own this exam attempt." });
    }

    if (attempt.completed_at) {
      return res.status(400).json({ error: "This exam attempt has already been submitted and graded." });
    }

    // 2. Fetch exam config (for passing score percentage)
    const exam = db.prepare(`
      SELECT * FROM exams WHERE id = ?
    `).get(attempt.exam_id) as any;

    if (!exam) {
      return res.status(404).json({ error: "Associated exam no longer exists." });
    }

    // Normalize incoming answers to map easily by questionId or question_id
    const answersList = Array.isArray(answers) ? answers : [];
    
    // 3. For each answered question, fetch correct_answer, check correctness, and log
    let earnedPoints = 0;
    let totalPoints = 0;
    const gradedQuestions: any[] = [];

    // Let's loop over submitted answers. To prevent forged question requests, ensure questions belong to this exam!
    for (const ans of answersList) {
      const qId = ans.questionId !== undefined ? ans.questionId : ans.question_id;
      const submittedValue = (ans.answer !== undefined ? ans.answer : ans.submitted_answer || "").toString().trim();

      const question = db.prepare(`
        SELECT id, question_text, question_type, correct_answer, points, options
        FROM exam_questions
        WHERE id = ? AND exam_id = ?
      `).get(Number(qId), attempt.exam_id) as any;

      if (!question) continue; // Skip invalid or hijacked questions

      const isCorrect = submittedValue.toLowerCase() === question.correct_answer.toString().trim().toLowerCase();
      totalPoints += question.points;
      if (isCorrect) {
        earnedPoints += question.points;
      }

      // Record student answer node in student_answers
      db.prepare(`
        INSERT INTO student_answers (attempt_id, question_id, submitted_answer, is_correct)
        VALUES (?, ?, ?, ?)
      `).run(Number(attemptId), question.id, submittedValue, isCorrect ? 1 : 0);

      gradedQuestions.push({
        id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        submitted_answer: submittedValue,
        correct_answer: question.correct_answer, // Since they submitted, we can return results
        is_correct: isCorrect,
        points: question.points
      });
    }

    // Defensive fallback if total points is 0 (e.g. somehow empty submission or no valid questions)
    if (totalPoints === 0) {
      totalPoints = 1;
    }

    const percentage = Math.round((earnedPoints / totalPoints) * 100);
    const passed = percentage >= (exam.passing_score_percentage || 70) ? 1 : 0;

    // 4. Update core attempt entry
    db.prepare(`
      UPDATE exam_attempts
      SET score = ?, passed = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(percentage, passed, Number(attemptId));

    // Update course_completed_at if passing final exam
    const isFinalExam = !exam.chapter_id || exam.chapter_id === 'final' || exam.chapter_id === '' || exam.exam_type === 'final';
    if (passed === 1 && isFinalExam) {
      try {
        db.prepare(`
          UPDATE enrollments
          SET course_completed_at = datetime('now')
          WHERE LOWER(email) = ? AND courseId = ? AND course_completed_at IS NULL
        `).run(attempt.user_id.trim().toLowerCase(), exam.course_id);
      } catch (completionErr: any) {
        console.error("Failed to mark course completion timestamp in DB:", completionErr.message);
      }
    }

    return res.json({
      success: true,
      message: "Exam graded successfully.",
      attempt: {
        id: Number(attemptId),
        exam_id: attempt.exam_id,
        score: percentage,
        passed: passed === 1,
        started_at: attempt.started_at,
        completed_at: new Date().toISOString()
      },
      earnedPoints,
      totalPoints,
      percentage,
      passed: passed === 1,
      passing_score_percentage: exam.passing_score_percentage || 70,
      questions: gradedQuestions
    });

  } catch (err: any) {
    console.error("[SUBMIT EXAM RESPONSE ERR]", err);
    return res.status(500).json({ error: "Failed to grade exam submission: " + err.message });
  }
}

// GET /api/lessons/:lessonId/problems - Fetch problems for a student lesson workspace
export function getLessonProblems(req: Request, res: Response) {
  const { lessonId } = req.params;
  try {
    const problems = db.prepare(`
      SELECT id, lesson_id, title, description_markdown, starter_code
      FROM lesson_problems
      WHERE lesson_id = ?
    `).all(Number(lessonId)) as any[];

    return res.json({ problems });
  } catch (err: any) {
    console.error("[GET LESSON PROBLEMS ERR]", err);
    return res.status(500).json({ error: "Failed to retrieve lesson problems: " + err.message });
  }
}

// GET /api/lessons/:lessonId - Retrieve dynamic configuration and details for a given lesson
export function getLessonDetail(req: Request, res: Response) {
  const { lessonId } = req.params;
  try {
    const lesson = db.prepare(`
      SELECT id, course_id, chapter, title, description, order_index, youtube_channel_id, is_chosen_for_recording
      FROM lessons
      WHERE id = ?
    `).get(Number(lessonId)) as any;

    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found." });
    }

    return res.json({ lesson });
  } catch (err: any) {
    console.error("[GET LESSON DETAIL ERR]", err);
    return res.status(500).json({ error: "Failed to retrieve lesson detail: " + err.message });
  }
}

// PATCH /api/admin/lessons/:lessonId/config - Update lessons configuration (e.g., youtube_channel_id, is_chosen_for_recording) for parallel instructors
export function updateLessonConfig(req: Request, res: Response) {
  const { lessonId } = req.params;
  const { youtube_channel_id, is_chosen_for_recording } = req.body;

  try {
    let updateResult;
    if (is_chosen_for_recording !== undefined) {
      const isChosenNum = is_chosen_for_recording ? 1 : 0;
      updateResult = db.prepare(`
        UPDATE lessons
        SET youtube_channel_id = ?, is_chosen_for_recording = ?
        WHERE id = ?
      `).run(
        youtube_channel_id === undefined ? null : youtube_channel_id,
        isChosenNum,
        Number(lessonId)
      );
    } else {
      updateResult = db.prepare(`
        UPDATE lessons
        SET youtube_channel_id = ?
        WHERE id = ?
      `).run(youtube_channel_id === undefined ? null : youtube_channel_id, Number(lessonId));
    }

    if (updateResult.changes === 0) {
      return res.status(404).json({ error: "Lesson not found or no changes made." });
    }

    return res.json({
      success: true,
      message: "Lesson configuration updated successfully to support parallel live broadcasts.",
      youtube_channel_id,
      is_chosen_for_recording
    });
  } catch (err: any) {
    console.error("[PATCH LESSON CONFIG ERR]", err);
    return res.status(500).json({ error: "Failed to update lesson configuration: " + err.message });
  }
}

export function getJaasToken(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized. Authentication is required." });
  }

  const { lessonId } = req.params;
  
  const appId = process.env.JAAS_APP_ID;
  const apiKeyId = process.env.JAAS_API_KEY_ID;
  const privateKey = process.env.JAAS_PRIVATE_KEY;

  if (!appId || appId.includes("vpaas-magic-cookie") || appId === "") {
    return res.status(500).json({ 
      error: "JAAS_APP_ID environment variable is missing or using a placeholder value. Please configure your JaaS App ID in the Settings -> Environment Variables menu." 
    });
  }

  if (!apiKeyId || apiKeyId.includes("your-jaas") || apiKeyId === "") {
    return res.status(500).json({ 
      error: "JAAS_API_KEY_ID environment variable is missing or using a placeholder value. Please configure your JaaS API Key ID in the Settings -> Environment Variables menu." 
    });
  }

  if (!privateKey || privateKey.includes("MIIE...") || privateKey === "") {
    return res.status(500).json({ 
      error: "JAAS_PRIVATE_KEY environment variable is missing or using a placeholder value. Please configure your PEM-formatted RSA Private Key (beginning with -----BEGIN RSA PRIVATE KEY-----) in the Settings -> Environment Variables menu." 
    });
  }

  try {
    const isModerator = user.role === "instructor" || user.role === "admin";
    
    const payload = {
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: "*",
      context: {
        user: {
          id: String(user.id),
          name: user.name,
          email: user.email,
        },
        features: {
          moderator: isModerator ? true : false,
        }
      }
    };

    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n').trim();

    // Verify key format before signing to prevent confusing crypto crashes
    if (!formattedPrivateKey.startsWith("-----BEGIN")) {
      return res.status(400).json({
        error: "JAAS_PRIVATE_KEY does not appear to be a valid PEM private key. It must start with '-----BEGIN PRIVATE KEY-----' or '-----BEGIN RSA PRIVATE KEY-----'. Please check your configuration in the Environment Variables."
      });
    }

    const token = jwt.sign(payload, formattedPrivateKey, {
      algorithm: "RS256",
      expiresIn: "2h",
      keyid: apiKeyId,
      header: {
        alg: "RS256",
        kid: apiKeyId,
      } as any
    });

    return res.json({
      success: true,
      token,
    });
  } catch (err: any) {
    console.error("[JAAS TOKEN EXCEPTION]", err);
    let userFriendlyError = err.message;
    if (err.message.includes("asymmetric key")) {
      userFriendlyError = "The JAAS_PRIVATE_KEY provided is not a valid asymmetric RSA key. Ensure you copied the entire PEM-formatted block, including the BEGIN and END lines, and configured it correctly as an RSA Private Key.";
    }
    return res.status(500).json({ error: "Failed to generate security token: " + userFriendlyError });
  }
}


