import db from "../db/database.js";

export function findByEmail(email: string): any {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export function findByVerificationToken(token: string): any {
  return db.prepare("SELECT * FROM users WHERE verificationToken = ?").get(token);
}

export function findByResetToken(token: string): any {
  return db.prepare("SELECT * FROM users WHERE resetToken = ?").get(token);
}

export function createStudent(userData: {
  email: string;
  name: string;
  passwordHash: string;
  verificationToken?: string;
  isVerified?: number;
}) {
  const isVerifiedValue = userData.isVerified !== undefined ? userData.isVerified : 0;
  const verificationTokenValue = userData.verificationToken || null;
  const insertStmt = db.prepare(`
    INSERT INTO users (email, name, passwordHash, passwordAlgorithm, role, isVerified, verificationToken)
    VALUES (?, ?, ?, 'bcrypt', 'student', ?, ?)
  `);
  insertStmt.run(
    userData.email,
    userData.name,
    userData.passwordHash,
    isVerifiedValue,
    verificationTokenValue
  );
}

export function verifyUser(email: string) {
  db.prepare("UPDATE users SET isVerified = 1, verificationToken = NULL WHERE email = ?").run(email);
}

export function updateVerificationToken(email: string, token: string) {
  db.prepare("UPDATE users SET verificationToken = ? WHERE email = ?").run(token, email);
}

export function updatePassword(email: string, hash: string, isLegacyUpgrade: boolean = false) {
  db.prepare(`
    UPDATE users 
    SET passwordHash = ?, passwordAlgorithm = 'bcrypt' 
    WHERE email = ?
  `).run(hash, email);
}

export function saveResetToken(email: string, token: string, expiresAt: string) {
  db.prepare(`
    UPDATE users 
    SET resetToken = ?, resetTokenExpires = ? 
    WHERE email = ?
  `).run(token, expiresAt, email);
}

export function clearResetToken(email: string) {
  db.prepare(`
    UPDATE users 
    SET resetToken = NULL, resetTokenExpires = NULL 
    WHERE email = ?
  `).run(email);
}
