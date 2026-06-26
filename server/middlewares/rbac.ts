import { Request, Response, NextFunction } from "express";
import db from "../db/database.js";

export function requireCourseOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized access." });
  }

  const isAdmin = user.role === "admin";
  if (isAdmin) {
    return next();
  }

  if (user.role !== "instructor") {
    return res.status(403).json({ error: "Access Denied: Instructor privileges required." });
  }

  let { courseId, examId } = req.params;

  try {
    if (!courseId && examId) {
      const exam = db.prepare("SELECT course_id FROM exams WHERE id = ?").get(examId) as
        | { course_id: string }
        | undefined;
      if (!exam) {
        return res.status(404).json({ error: "Exam not found." });
      }
      courseId = exam.course_id;
    }

    if (!courseId) {
      return res.status(400).json({ error: "Course ID or Exam ID is required for authorization check." });
    }

    const profile = db.prepare("SELECT id FROM instructor_profiles WHERE LOWER(user_email) = ?").get(
      user.email.trim().toLowerCase()
    ) as any;
    if (!profile) {
      return res.status(403).json({ error: "Access Denied: Instructor profile not found." });
    }

    const association = db.prepare(`
      SELECT 1 FROM course_instructors WHERE course_id = ? AND instructor_profile_id = ?
    `).get(courseId, profile.id);

    if (!association) {
      return res.status(403).json({
        error: "Access Denied: You are not assigned to instruct/manage this course."
      });
    }

    return next();
  } catch (err: any) {
    console.error("[RBAC COURSE OWNERSHIP CHECK ERR]", err);
    return res.status(500).json({
      error: "Internal server error during authorization: " + err.message
    });
  }
}

export function forbidStudentUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized access." });
  }
  if (user.role === "student") {
    return res.status(403).json({
      error: "Forbidden: Student accounts are restricted from uploading or managing platform documents."
    });
  }
  return next();
}
