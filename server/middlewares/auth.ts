import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import db from "../db/database.js";

const JWT_SECRET = process.env.JWT_SECRET || "mountech_academy_secret_token_key_777";

export interface UserPayload {
  email: string;
  name: string;
  role?: "admin" | "instructor" | "student";
}

export function createToken(payload: UserPayload): string {
  // Use jsonwebtoken for robust standard sign-offs
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access. No session token provided." });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Session expired or invalid token." });
  }

  try {
    const emailLower = payload.email.trim().toLowerCase();
    let dbUser = db.prepare("SELECT * FROM users WHERE email = ?").get(emailLower) as any;
    
    // Resolve dynamic or persisted role
    let role = "student";
    if (emailLower === "jhanak.parajuli@gmail.com" || emailLower === "admin@mountech.academy" || emailLower === "developer@mountech.academy") {
      role = "admin";
    } else if (emailLower === "instructor@mountech.academy") {
      role = "instructor";
    } else if (dbUser) {
      role = dbUser.role;
    }

    // Auto-create user if missing in DB to satisfy foreign keys (e.g. for enrollments or ratings)
    if (!dbUser) {
      db.prepare(`
        INSERT OR IGNORE INTO users (email, name, passwordHash, passwordAlgorithm, role, isVerified)
        VALUES (?, ?, 'oauth_fallback_placeholder', 'bcrypt', ?, 1)
      `).run(emailLower, payload.name || "Academic Scholar", role);
      dbUser = db.prepare("SELECT * FROM users WHERE email = ?").get(emailLower) as any;
    } else if (dbUser.role !== role) {
      // Sync DB role if it differs from forced roles
      db.prepare("UPDATE users SET role = ? WHERE email = ?").run(role, emailLower);
    }

    (req as any).user = {
      id: dbUser ? dbUser.id : null,
      email: payload.email,
      name: dbUser ? dbUser.name : payload.name,
      role
    };

    next();
  } catch (error: any) {
    return res.status(500).json({ error: "Authentication system error: " + error.message });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        error: `Forbidden access. This laboratory section is limited to ${allowedRoles.join(" / ")} role-holders.` 
      });
    }
    next();
  };
}

export function requireSyllabusEditAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  // Admin role has global access
  if (user.role === "admin") {
    return next();
  }

  // Instructor role has access if assigned in course_instructors
  if (user.role === "instructor") {
    const { courseId } = req.params;
    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required." });
    }

    try {
      const profile = db.prepare("SELECT id FROM instructor_profiles WHERE LOWER(user_email) = ?")
        .get(user.email.trim().toLowerCase()) as any;
        
      if (!profile) {
        return res.status(403).json({ error: "Access Denied: Instructor profile not found." });
      }

      const association = db.prepare(`
        SELECT 1 FROM course_instructors WHERE course_id = ? AND instructor_profile_id = ?
      `).get(courseId, profile.id);

      if (!association) {
        return res.status(403).json({ error: "Access Denied: You are not assigned as an instructor for this course." });
      }

      return next();
    } catch (error: any) {
      return res.status(500).json({ error: "Authorization lookup failure: " + error.message });
    }
  }

  return res.status(403).json({ error: "Access Denied: Insufficient permissions to edit curriculum." });
}

export function checkCourseSunset(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return next();
  }

  // Admins and instructors do not have access locks
  if (user.role === "admin" || user.role === "instructor") {
    return next();
  }

  let courseId = req.params.courseId || req.body.courseId || req.query.courseId;
  const { attemptId, sessionId } = req.params;

  try {
    if (!courseId && attemptId) {
      const attemptRow = db.prepare(`
        SELECT e.course_id 
        FROM exam_attempts ea
        JOIN exams e ON ea.exam_id = e.id
        WHERE ea.id = ?
      `).get(attemptId) as { course_id: string } | undefined;
      if (attemptRow) {
        courseId = attemptRow.course_id;
      }
    } else if (!courseId && sessionId) {
      const sessionRow = db.prepare(`
        SELECT course_id FROM live_sessions WHERE id = ?
      `).get(sessionId) as { course_id: string } | undefined;
      if (sessionRow) {
        courseId = sessionRow.course_id;
      }
    }

    if (!courseId) {
      return next();
    }

    const enrollment = db.prepare(`
      SELECT certificate_downloaded_at 
      FROM enrollments 
      WHERE LOWER(email) = ? AND courseId = ?
    `).get(user.email.trim().toLowerCase(), courseId) as { certificate_downloaded_at: string | null } | undefined;

    if (enrollment && enrollment.certificate_downloaded_at) {
      const downloadedAt = new Date(enrollment.certificate_downloaded_at);
      const now = new Date();
      const diffTime = now.getTime() - downloadedAt.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays > 15) {
        return res.status(403).json({
          error: "Course access expired",
          message: "Your 15-day post-completion access has expired. Congratulations on finishing the course!"
        });
      }
    }
  } catch (err: any) {
    console.error("Sunset middleware error:", err.message);
  }

  next();
}

