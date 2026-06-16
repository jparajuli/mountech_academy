import { Request, Response } from "express";
import db from "../db/database.js";

// Admin: Fetch all users list
export function getUsers(req: Request, res: Response) {
  try {
    const users = db.prepare("SELECT email, name, role, isVerified FROM users").all() as any[];
    const usersList = users.map((u) => ({
      email: u.email,
      name: u.name,
      role: u.role,
      isVerified: u.isVerified === 1
    }));
    return res.json({ users: usersList });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to retrieve users directory on administrative board: " + err.message });
  }
}

// Admin: Fetch all registered courses/enrollments for active management
export function getEnrollments(req: Request, res: Response) {
  try {
    const enrollments = db.prepare("SELECT * FROM enrollments ORDER BY timestamp DESC").all();
    return res.json({ enrollments });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to retrieve registered courses logs: " + err.message });
  }
}

// Admin: Modify user core role
export function updateRole(req: Request, res: Response) {
  const { email, role } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = db.prepare("SELECT name FROM users WHERE email = ?").get(normalizedEmail) as any;
    if (!user) {
      return res.status(404).json({ error: "Scholar account matching provided email cannot be located." });
    }

    db.prepare("UPDATE users SET role = ? WHERE email = ?").run(role, normalizedEmail);

    return res.json({
      success: true,
      message: `Successfully updated ${user.name || email}'s core role to: ${role}`
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to modify role registration: " + err.message });
  }
}

// Admin: Fetch all audit logins log
export function getAuditLogs(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const total = (db.prepare("SELECT COUNT(*) AS count FROM logins").get() as any).count;
    const logs = db.prepare(`
      SELECT * FROM logins 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    return res.json({ logs, total, limit, offset });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to retrieve audit logins logs: " + err.message });
  }
}
