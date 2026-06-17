import { Request, Response } from "express";
import db from "../db/database.js";
import { catchAsync } from "../utils/catchAsync.js";

// Admin: Fetch all users list
export const getUsers = catchAsync(async (req: Request, res: Response) => {
  const users = db.prepare("SELECT email, name, role, isVerified FROM users").all() as any[];
  const usersList = users.map((u) => ({
    email: u.email,
    name: u.name,
    role: u.role,
    isVerified: u.isVerified === 1
  }));
  return res.json({ users: usersList });
});

// Admin: Fetch all registered courses/enrollments for active management
export const getEnrollments = catchAsync(async (req: Request, res: Response) => {
  const enrollments = db.prepare("SELECT * FROM enrollments ORDER BY timestamp DESC").all();
  return res.json({ enrollments });
});

// Admin: Modify user core role
export const updateRole = catchAsync(async (req: Request, res: Response) => {
  const { email, role } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const user = db.prepare("SELECT name FROM users WHERE email = ?").get(normalizedEmail) as any;
  if (!user) {
    return res.status(404).json({ error: "Scholar account matching provided email cannot be located." });
  }

  db.prepare("UPDATE users SET role = ? WHERE email = ?").run(role, normalizedEmail);

  return res.json({
    success: true,
    message: `Successfully updated ${user.name || email}'s core role to: ${role}`
  });
});

// Admin: Fetch all audit logins log
export const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  const total = (db.prepare("SELECT COUNT(*) AS count FROM logins").get() as any).count;
  const logs = db.prepare(`
    SELECT * FROM logins 
    ORDER BY timestamp DESC 
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  return res.json({ logs, total, limit, offset });
});

