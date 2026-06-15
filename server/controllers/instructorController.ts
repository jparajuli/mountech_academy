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
    const isAdmin = user.role === "admin" || user.role === "developer";
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
