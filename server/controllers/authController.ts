import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import * as UserRepository from "../repositories/UserRepository.js";
import * as AuditRepository from "../repositories/AuditRepository.js";
import { createToken } from "../middlewares/auth.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/email.js";

// Helper to determine base URL securely, with full support for local, Codespaces, and custom configurations without Host Header Injection vulnerabilities.
export function getBaseUrl(): string {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.CODESPACES === "true" && process.env.CODESPACE_NAME) {
    const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "app.github.dev";
    return `https://${process.env.CODESPACE_NAME}-3000.${domain}`;
  }
  return "http://localhost:3000";
}

// Database Log helper for Login authentication events
export function logLoginEvent(email: string, name: string, status: string, details: string) {
  AuditRepository.logLoginEvent(email, name, status, details);
}

// User OAuth registration & login controller (instantly pre-verified)
export async function oauth(req: Request, res: Response) {
  const { email, name, provider } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    let user = UserRepository.findByEmail(normalizedEmail);

    if (!user) {
      // Register custom pre-verified user
      const randomPassword = crypto.randomBytes(16).toString("hex");
      // Pre-verified OAuth log is generated as bcrypt securely
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      
      UserRepository.createStudent({
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        isVerified: 1
      });
      
      user = {
        email: normalizedEmail,
        name: name.trim(),
        role: "student",
        isVerified: 1,
      };
    } else if (user.isVerified === 0) {
      // If user was previously registered but not verified, verify them since OAuth confirms email ownership
      UserRepository.verifyUser(normalizedEmail);
      user.isVerified = 1;
    }

    const token = createToken({ email: normalizedEmail, name: user.name, role: user.role });
    logLoginEvent(normalizedEmail, user.name, "SUCCESS", `Authorized ${provider || "OAuth"} Session`);

    return res.json({
      message: "OAuth authorization successful.",
      token,
      user: { email: normalizedEmail, name: user.name, role: user.role }
    });
  } catch (err: any) {
    console.error("[AUTH OAUTH ERR]", err);
    return res.status(500).json({ error: "Failed to authenticate session: " + err.message });
  }
}

// User Registration controller
export async function register(req: Request, res: Response) {
  const { email, name, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = UserRepository.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: "An account with this email address already exists." });
    }

    // Hash password securely with bcrypt for modern state of the art persistence
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    UserRepository.createStudent({
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      verificationToken
    });

    const baseUrl = getBaseUrl();
    const link = await sendVerificationEmail(
      normalizedEmail,
      name.trim(),
      verificationToken,
      baseUrl
    );

    return res.status(201).json({
      message: "Registration successful! A verification link has been sent to your email address.",
      needsVerification: true,
      email: normalizedEmail,
      verificationLink: link
    });
  } catch (err: any) {
    console.error("[AUTH REGISTER ERR]", err);
    return res.status(500).json({ error: "Failed to register account: " + err.message });
  }
}

// Resend Verification Email controller
export async function resend(req: Request, res: Response) {
  const { email } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = UserRepository.findByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: "No student account found with this email speech." });
    }

    if (user.isVerified === 1) {
      return res.status(400).json({ error: "This email address is already verified. Proceed directly to log in." });
    }

    let verificationToken = user.verificationToken;
    if (!verificationToken) {
      verificationToken = crypto.randomBytes(32).toString("hex");
      UserRepository.updateVerificationToken(normalizedEmail, verificationToken);
    }

    const baseUrl = getBaseUrl();
    const link = await sendVerificationEmail(
      user.email,
      user.name,
      verificationToken,
      baseUrl
    );

    return res.json({
      message: "A fresh verification link has been distributed to your verified inbox.",
      verificationLink: link
    });
  } catch (err: any) {
    console.error("[AUTH RESEND ERR]", err);
    return res.status(500).json({ error: "Failed to resend token: " + err.message });
  }
}

// HTML Account Verify Link receiver controller
export async function verify(req: Request, res: Response) {
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).send("<h1>Verification Failed</h1><p>Missing verification token credentials.</p>");
  }

  try {
    const user = UserRepository.findByVerificationToken(token);
    if (!user) {
      return res.status(400).send("<h1>Verification Failed</h1><p>The verification link is invalid, expired, or has already been used.</p>");
    }

    UserRepository.verifyUser(user.email);

    return res.send(`
      <html>
        <head>
          <title>Mountech Account Verified</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght=400;600;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #f9fafb; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #111827; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e5e7eb; max-width: 420px; text-align: center; }
            .logo { color: #0070f3; font-weight: 800; font-size: 24px; margin-bottom: 20px; text-transform: uppercase; font-family: monospace; tracking: 1px; }
            .icon { width: 50px; height: 50px; background: #ecfdf5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 24px; font-weight: bold; }
            h1 { font-size: 20px; margin-top: 0; margin-bottom: 10px; font-weight: 800; }
            p { font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 24px; }
            .btn { background: #111827; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block; transition: background 0.2s; border: none; cursor: pointer; }
            .btn:hover { background: #0070f3; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <div class="logo">Mountech Academy</div>
            <h1>Email Verified Successfully!</h1>
            <p>Thank you for logging a real scholar account. Your registered email is now verified. You can log in to your active learning workspace.</p>
            <a href="/?verified=true" class="btn">Proceed to Sign In</a>
          </div>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("[AUTH VERIFY ERR]", err);
    return res.status(500).send(`<h1>System Verification Error</h1><p>${err.message}</p>`);
  }
}

// User Login controller with automatic hash upgrades
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = UserRepository.findByEmail(normalizedEmail);
    if (!user) {
      logLoginEvent(normalizedEmail, "Unknown", "FAILED_INVALID_CREDENTIALS", "Unauthorized Web Access");
      return res.status(401).json({ error: "Invalid email or password." });
    }

    let isMatch = false;
    let needsUpgrade = false;

    if (user.passwordAlgorithm === "sha256") {
      // Legacy SHA-256 verification
      const legacyHash = crypto.createHash("sha256").update(password).digest("hex");
      if (user.passwordHash === legacyHash) {
        isMatch = true;
        needsUpgrade = true; // Flag that this account's password should upgrade to bcrypt now
      }
    } else {
      // Modern bcrypt verification
      isMatch = await bcrypt.compare(password, user.passwordHash);
    }

    if (!isMatch) {
      logLoginEvent(normalizedEmail, user.name, "FAILED_INVALID_CREDENTIALS", "Unauthorized Web Access");
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Apply password hashing live upgrades transparently!
    if (needsUpgrade) {
      console.log(`[AUTH CRYPTO UPGRADE] Upgrading algorithm to bcrypt for ${normalizedEmail}...`);
      const newBcryptHash = await bcrypt.hash(password, 10);
      UserRepository.updatePassword(normalizedEmail, newBcryptHash, true);
    }

    // Block login for unverified accounts strictly
    if (user.isVerified === 0) {
      logLoginEvent(normalizedEmail, user.name, "BLOCKED_UNVERIFIED", "Authentication Safeguard Block");
      const verifyTokenStr = user.verificationToken;
      return res.status(403).json({
        error: "unverified",
        message: "Please verify your email address before signing in.",
        email: normalizedEmail,
        verificationLink: verifyTokenStr
          ? `${getBaseUrl()}/api/auth/verify?token=${verifyTokenStr}`
          : null
      });
    }

    // Produce JWT with standard jsonwebtoken
    const token = createToken({ email: normalizedEmail, name: user.name, role: user.role });
    logLoginEvent(normalizedEmail, user.name, "SUCCESS", "Authorized Web Session");

    return res.json({
      message: "Login successful.",
      token,
      user: { email: normalizedEmail, name: user.name, role: user.role }
    });
  } catch (err: any) {
    console.error("[AUTH LOGIN ERR]", err);
    return res.status(500).json({ error: "Failed to verify credentials: " + err.message });
  }
}

// Fetch session user profile details
export function me(req: Request, res: Response) {
  return res.json({ user: (req as any).user });
}

// Fetch Current User's dynamic log listings
export function logins(req: Request, res: Response) {
  try {
    const currentEmail = (req as any).user.email;
    const records = AuditRepository.getRecentLoginsByEmail(currentEmail);
    return res.json({ logins: records });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to read logged events: " + err.message });
  }
}

// User Password Reset controller
export async function resetPassword(req: Request, res: Response) {
  const { email, newPassword } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = UserRepository.findByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: "No student account found with this email address." });
    }

    // Hash securely using bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 10);
    UserRepository.updatePassword(normalizedEmail, passwordHash);

    logLoginEvent(normalizedEmail, user.name, "PASSWORD_RESET", "Scholar changed password voluntarily");

    return res.json({
      success: true,
      message: "Your password has been successfully reset. You can now log in."
    });
  } catch (err: any) {
    console.error("[AUTH RESET PASSWORD ERR]", err);
    return res.status(500).json({ error: "Failed to reset password: " + err.message });
  }
}

// 1. Password Recovery Initiator (Generates resetToken)
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = UserRepository.findByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: "No registered student account was found with this email address." });
    }

    // Generate secure recovery token (expires in 1 hour)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000).toISOString();

    UserRepository.saveResetToken(normalizedEmail, token, expires);

    const appUrl = getBaseUrl().replace(/\/$/, "");
    const resetLink = `${appUrl}/signin?resetToken=${token}`;

    await sendPasswordResetEmail(normalizedEmail, user.name, token, appUrl);

    return res.json({
      success: true,
      message: "A password verification link has been sent to your email address.",
      token,
      resetLink
    });
  } catch (err: any) {
    console.error("[AUTH FORGOT PASSWORD ERR]", err);
    return res.status(500).json({ error: "Failed to request password recovery: " + err.message });
  }
}

// 2. Query token validity verification
export async function verifyResetToken(req: Request, res: Response) {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Password reset token is required." });
  }

  try {
    const user = UserRepository.findByResetToken(token);
    if (!user) {
      return res.status(400).json({ error: "The recovery link is invalid or expired. Please submit a new request." });
    }

    if (user.resetTokenExpires && new Date(user.resetTokenExpires) < new Date()) {
      return res.status(400).json({ error: "The recovery link has expired. Please submit a new request." });
    }

    return res.json({
      success: true,
      email: user.email,
    });
  } catch (err: any) {
    console.error("[AUTH VERIFY RESET TOKEN ERR]", err);
    return res.status(500).json({ error: "Failed to verify recovery token: " + err.message });
  }
}

// 3. Complete Password recovery using token
export async function resetPasswordWithToken(req: Request, res: Response) {
  const { token, newPassword } = req.body;

  try {
    const user = UserRepository.findByResetToken(token);
    if (!user) {
      return res.status(400).json({ error: "The recovery link is invalid or expired. Please submit a new request." });
    }

    if (user.resetTokenExpires && new Date(user.resetTokenExpires) < new Date()) {
      return res.status(400).json({ error: "The recovery link has expired. Please submit a new request." });
    }

    // Hash securely using bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 10);
    UserRepository.updatePassword(user.email, passwordHash);
    UserRepository.clearResetToken(user.email);

    logLoginEvent(user.email, user.name, "PASSWORD_RECOVERED_SECURELY", "Scholar recovered account securely with token-based authentication");

    return res.json({
      success: true,
      message: "Your password has been changed successfully. You can now login with your new credentials."
    });
  } catch (err: any) {
    console.error("[AUTH RESET PASSWORD WITH TOKEN ERR]", err);
    return res.status(500).json({ error: "Failed to recover password: " + err.message });
  }
}
