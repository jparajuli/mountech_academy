import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import db from "../db/database.js";

const JWT_SECRET = process.env.JWT_SECRET || "mountech_academy_secret_token_key_777";

export interface UserPayload {
  email: string;
  name: string;
  role?: "admin" | "instructor" | "student" | "developer";
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
    // Look up the user in the SQLite database
    const dbUser = db.prepare("SELECT * FROM users WHERE email = ?").get(payload.email.trim().toLowerCase()) as any;
    
    // Resolve dynamic or persisted role
    let role = "student";
    if (dbUser) {
      role = dbUser.role;
    } else {
      // Direct email checks for oauth fallbacks if not yet persisted
      const email = payload.email.trim().toLowerCase();
      if (email === "jhanak.parajuli@gmail.com" || email === "admin@mountech.academy") {
        role = "admin";
      } else if (email === "instructor@mountech.academy") {
        role = "instructor";
      } else if (email === "developer@mountech.academy") {
        role = "developer";
      }
    }

    (req as any).user = {
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
