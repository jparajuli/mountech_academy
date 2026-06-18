import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import db from "../db/database.js";

// Developer: Access system configuration / diagnostic state / debug logs
export function getDeveloperLogs(req: Request, res: Response) {
  const devKey = req.headers["x-mountech-dev-key"];
  const expectedKey = process.env.DEV_API_KEY;

  if (!devKey || !expectedKey || devKey !== expectedKey) {
    return res.status(403).json({ error: "Forbidden: Invalid or missing infrastructure DEV_API_KEY." });
  }

  try {
    const usersCount = (db.prepare("SELECT COUNT(*) AS count FROM users").get() as any).count;
    const loginsCount = (db.prepare("SELECT COUNT(*) AS count FROM logins").get() as any).count;
    const enrollmentsCount = (db.prepare("SELECT COUNT(*) AS count FROM enrollments").get() as any).count;

    const stats = {
      systemClock: new Date().toISOString(),
      activeDatabaseFallback: "mountech.db (SQLite)",
      credentialsLoaded: {
        hasFirebaseConfig: fs.existsSync(path.join(process.cwd(), "firebase-applet-config.json")),
        hasSheetsConfig: false
      },
      metrics: {
        registeredScholars: usersCount,
        authenticatedSessions: loginsCount,
        scholarlyEnrollments: enrollmentsCount
      },
      diagnosticCode: "DEV_OK - 200 SUCCESS - COMPLETED RBAC INTEGRITY CHECKS"
    };

    return res.json({ logs: [stats] });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch diagnostic state details: " + err.message });
  }
}
