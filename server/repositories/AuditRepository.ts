import db from "../db/database.js";

export function logLoginEvent(email: string, name: string, status: string, details: string) {
  try {
    const stmt = db.prepare(`
      INSERT INTO logins (email, name, status, timestamp, details)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(email, name, status, new Date().toISOString(), details);
  } catch (err: any) {
    console.error("[DATABASE LOGGER] Local log insertion failed:", err.message);
  }
}

export function getRecentLoginsByEmail(email: string): any[] {
  return db.prepare("SELECT * FROM logins WHERE email = ? ORDER BY timestamp DESC").all(email) as any[];
}
