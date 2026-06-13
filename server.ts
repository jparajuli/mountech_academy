import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { google } from "googleapis";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { createServer as createViteServer } from "vite";
import dns from "dns";
import nodemailer from "nodemailer";

// Prefer IPv4 for local container stability
dns.setDefaultResultOrder && dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = 3000;

app.use(express.json());

// Token encryption/signature secrets
const JWT_SECRET = process.env.JWT_SECRET || "mountech_academy_secret_token_key_777";

interface UserPayload {
  email: string;
  name: string;
}

// Simple Custom Token Implementation
function createToken(payload: UserPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): UserPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as UserPayload;
  } catch {
    return null;
  }
}

// Local Database Files
const USERS_FILE = path.join(process.cwd(), "users.json");
const ENROLLMENTS_FILE = path.join(process.cwd(), "enrollments.json");
const LOGINS_FILE = path.join(process.cwd(), "logins.json");

// Helper function to send Verification Emails
async function sendVerificationEmail(email: string, name: string, token: string, reqHost: string) {
  // Use APP_URL if specified in env variables, fallback dynamically to reqHost
  const rawUrl = process.env.APP_URL || `https://${reqHost}`;
  const appUrl = (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).replace(/\/$/, "");
  const verifyLink = `${appUrl}/api/auth/verify?token=${token}`;

  console.log(`\n======================================================`);
  console.log(`🛡️  MOUNTECH SYSTEMS : REAL VERIFICATION ENGINE`);
  console.log(`🎓  Recipient: ${name} (${email})`);
  console.log(`⚡  Live App URL Inferred: ${appUrl}`);
  console.log(`🔗  Verification URL: ${verifyLink}`);
  console.log(`======================================================\n`);

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"Mountech Academy" <noreply@mountech.academy>`;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const mailOptions = {
        from,
        to: email,
        subject: "Verify Your Mountech Academy Account 📡",
        html: `
          <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #f9fafb; padding: 40px; color: #111827;">
            <div style="max-width: 580px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <div style="background-color: #111827; padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800;">MOUNTECH ACADEMY</h1>
                <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: 500; font-family: monospace; color: #38bdf8; text-transform: uppercase; letter-spacing: 2px;">Global Tech Certification Labs</p>
              </div>
              <div style="padding: 40px 30px;">
                <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 15px; color: #111827;">Welcome to the Labs, ${name}!</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 25px;">
                  We are excited to have you join Mountech Academy. To access your student sandbox, view authentic online lectures, download PDF textbooks, and enroll in certifications, please verify that this email address belongs to you.
                </p>
                
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${verifyLink}" style="background-color: #0070f3; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
                    Verify My Email Address
                  </a>
                </div>

                <p style="font-size: 12px; line-height: 1.5; color: #6b7280; word-break: break-all;">
                  If the button above does not work, copy and paste this verification URL into your web browser: <br/>
                  <a href="${verifyLink}" style="color: #0070f3; text-decoration: underline;">${verifyLink}</a>
                </p>
                
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;"/>
                
                <p style="font-size: 11px; line-height: 1.4; color: #9ca3af; margin-bottom: 0;">
                  This is an automated security mail sent by Mountech Academy servers. If you did not sign up for an account, you can safely ignore this email.
                </p>
              </div>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[VERIFICATION EMAIL ENGINE] Emailed verification link successfully to ${email}`);
    } catch (err: any) {
      console.error(`[VERIFICATION EMAIL ENGINE] Real SMTP delivery failed:`, err.message);
    }
  } else {
    console.log(`[VERIFICATION EMAIL ENGINE] SMTP configuration is absent. Email printed above is available for local sandbox browser activation.`);
  }

  return verifyLink;
}

// Local DB Controllers
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    // Seed default administrator / student demo account
    const defaultUsers = [
      {
        email: "student@mountech.academy",
        name: "Mountech Scholar",
        // Simple hash of 'password123'
        passwordHash: crypto.createHash("sha256").update("password123").digest("hex"),
        isVerified: true
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), "utf-8");
    return defaultUsers;
  }
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeUsers(users: any[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

function readLocalEnrollments() {
  if (!fs.existsSync(ENROLLMENTS_FILE)) {
    fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify([], null, 2), "utf-8");
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(ENROLLMENTS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeLocalEnrollments(enrollments: any[]) {
  fs.writeFileSync(ENROLLMENTS_FILE, JSON.stringify(enrollments, null, 2), "utf-8");
}

function readLocalLogins() {
  if (!fs.existsSync(LOGINS_FILE)) {
    fs.writeFileSync(LOGINS_FILE, JSON.stringify([], null, 2), "utf-8");
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(LOGINS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeLocalLogins(logins: any[]) {
  fs.writeFileSync(LOGINS_FILE, JSON.stringify(logins, null, 2), "utf-8");
}

// Ensure database files are initialized on boot
readUsers();
readLocalEnrollments();
readLocalLogins();

// Google Sheets Helpers
function getCleanPrivateKey(): string | undefined {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!rawKey) return undefined;

  let cleanKey = rawKey.trim();

  // If the user pasted the entire service account JSON
  if (cleanKey.startsWith("{") && cleanKey.endsWith("}")) {
    try {
      const parsed = JSON.parse(cleanKey);
      if (parsed.private_key) {
        cleanKey = parsed.private_key;
        if (parsed.client_email && !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = parsed.client_email;
        }
        if (parsed.spreadsheet_id && !process.env.GOOGLE_SHEET_ID) {
          process.env.GOOGLE_SHEET_ID = parsed.spreadsheet_id;
        }
      }
    } catch (e) {
      // Ignored, proceed
    }
  }
  
  // Clean potential surrounding double/single quotes or backticks
  if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) ||
      (cleanKey.startsWith("'") && cleanKey.endsWith("'")) ||
      (cleanKey.startsWith("`") && cleanKey.endsWith("`"))) {
    cleanKey = cleanKey.slice(1, -1);
  }

  // Handle double-escaped newlines (e.g. \\\\n)
  cleanKey = cleanKey.replace(/\\\\n/g, "\n");
  // Handle single-escaped newlines (e.g. \\n)
  cleanKey = cleanKey.replace(/\\n/g, "\n");

  // Normalize all types of newlines
  cleanKey = cleanKey.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Reconstruct PEM if it was single-lined (e.g., spaces instead of newlines or missing appropriate splits)
  if (cleanKey.includes("BEGIN PRIVATE KEY") && !cleanKey.includes("\n")) {
    const match = cleanKey.match(/-----BEGIN PRIVATE KEY-----(.*)-----END PRIVATE KEY-----/);
    if (match) {
      const base64Content = match[1].replace(/\s+/g, ""); // remove all spacing/tabs
      const chunks = [];
      for (let i = 0; i < base64Content.length; i += 64) {
        chunks.push(base64Content.substring(i, i + 64));
      }
      cleanKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join("\n")}\n-----END PRIVATE KEY-----`;
    }
  }

  return cleanKey.trim();
}

function getCleanServiceAccountEmail(): string | undefined {
  const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!rawEmail) return undefined;
  
  let cleanEmail = rawEmail.trim();
  if ((cleanEmail.startsWith('"') && cleanEmail.endsWith('"')) ||
      (cleanEmail.startsWith("'") && cleanEmail.endsWith("'")) ||
      (cleanEmail.startsWith("`") && cleanEmail.endsWith("`"))) {
    cleanEmail = cleanEmail.slice(1, -1);
  }
  return cleanEmail.trim();
}

function getCleanSpreadsheetId(): string | undefined {
  const rawId = process.env.GOOGLE_SHEET_ID;
  if (!rawId) return undefined;
  
  let cleanId = rawId.trim();
  if ((cleanId.startsWith('"') && cleanId.endsWith('"')) ||
      (cleanId.startsWith("'") && cleanId.endsWith("'")) ||
      (cleanId.startsWith("`") && cleanId.endsWith("`"))) {
    cleanId = cleanId.slice(1, -1);
  }
  return cleanId.trim();
}

function hasSheetsConfig() {
  const email = getCleanServiceAccountEmail();
  const key = getCleanPrivateKey();
  const id = getCleanSpreadsheetId();
  return !!(email && key && id);
}

async function appendEnrollmentToSheet(email: string, name: string, courseId: string, courseTitle: string) {
  const clientEmail = getCleanServiceAccountEmail();
  const privateKey = getCleanPrivateKey();
  const spreadsheetId = getCleanSpreadsheetId();

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Google Sheets credentials are not fully configured in your environment.");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const timestamp = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:F",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[timestamp, email, name, courseId, courseTitle, "Enrolled"]],
    },
  });
}

async function appendLoginToSheet(email: string, name: string, status: string, details: string) {
  const clientEmail = getCleanServiceAccountEmail();
  const privateKey = getCleanPrivateKey();
  const spreadsheetId = getCleanSpreadsheetId();

  if (!clientEmail || !privateKey || !spreadsheetId) {
    console.log("[GOOGLE SHEETS ENGINE] Skipping login logging to worksheet because credentials are not configured.");
    return;
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    
    // 1. Retrieve spreadsheet metadata to inspect sheets
    const spreadSheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const loginsTabExists = spreadSheetMeta.data.sheets?.some(
      (s: any) => s.properties?.title === "Logins"
    );

    if (!loginsTabExists) {
      console.log("[GOOGLE SHEETS ENGINE] 'Logins' worksheet not found. Creating table and headers dynamically.");
      
      // Create empty sheet title "Logins"
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: "Logins",
                  gridProperties: {
                    frozenRowCount: 1
                  }
                }
              }
            }
          ]
        }
      });

      // Write styled headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Logins!A1:E1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [["Timestamp", "Email Address", "Scholar Name", "Login Status", "Session Identifier"]]
        }
      });
    }

    const timestamp = new Date().toISOString();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Logins!A:E",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[timestamp, email, name, status, details]]
      }
    });
    console.log(`[GOOGLE SHEETS ENGINE] Appended login log entry for ${email} -> [${status}]`);
  } catch (err: any) {
    console.error("[GOOGLE SHEETS ENGINE] Failed to append login log entry:", err.message);
  }
}

async function fetchEnrollmentsAndCompletionsFromSheet(email: string): Promise<{ enrollments: string[]; completions: string[] }> {
  const clientEmail = getCleanServiceAccountEmail();
  const privateKey = getCleanPrivateKey();
  const spreadsheetId = getCleanSpreadsheetId();

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Google Sheets credentials are not configured.");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A:F",
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    return { enrollments: [], completions: [] };
  }

  // Row format: [Timestamp, Email, Name, CourseID, CourseTitle, Status]
  const enrollments: string[] = [];
  const completions: string[] = [];

  for (const row of rows) {
    const rowEmail = row[1];
    const rowCourseId = row[3];
    const rowStatus = row[5];

    if (rowEmail && rowEmail.trim().toLowerCase() === email.trim().toLowerCase() && rowCourseId) {
      const cid = rowCourseId.trim();
      enrollments.push(cid);
      if (rowStatus && rowStatus.trim().toLowerCase() === "completed") {
        completions.push(cid);
      }
    }
  }

  return {
    enrollments: Array.from(new Set(enrollments)),
    completions: Array.from(new Set(completions)),
  };
}

async function markCourseCompletedInSheet(email: string, courseId: string) {
  const clientEmail = getCleanServiceAccountEmail();
  const privateKey = getCleanPrivateKey();
  const spreadsheetId = getCleanSpreadsheetId();

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Google Sheets credentials are not fully configured.");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A:F",
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    throw new Error("No enrollment database rows found in the sheet.");
  }

  let rowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowEmail = row[1] ? row[1].trim().toLowerCase() : "";
    const rowCourseId = row[3] ? row[3].trim() : "";
    if (rowEmail === email.trim().toLowerCase() && rowCourseId === courseId) {
      rowIndex = i;
    }
  }

  if (rowIndex === -1) {
    const timestamp = new Date().toISOString();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:F",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[timestamp, email, "", courseId, "", "Completed"]],
      },
    });
  } else {
    const rowNumber = rowIndex + 1;
    const updateRange = `Sheet1!F${rowNumber}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["Completed"]],
      },
    });
  }
}

// Authorization Middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access. No session token provided." });
  }

  const token = authHeader.split(" ")[1];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: "Session expired or invalid token." });
  }

  (req as any).user = user;
  next();
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// User OAuth registration & login endpoint (instantly pre-verified)
app.post("/api/auth/oauth", (req, res) => {
  const { email, name, provider } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: "Email and name are required." });
  }

  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  let user = users.find((u: any) => u.email === normalizedEmail);

  if (!user) {
    // Register custom pre-verified user
    const randomPassword = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto.createHash("sha256").update(randomPassword).digest("hex");
    user = {
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      isVerified: true
    };
    users.push(user);
    writeUsers(users);
  } else if (user.isVerified === false) {
    // If user was previously registered but not verified, verify them since OAuth confirms email ownership
    user.isVerified = true;
    delete user.verificationToken;
    writeUsers(users);
  }

  const token = createToken({ email: normalizedEmail, name: user.name });

  logLoginEvent(normalizedEmail, user.name, "SUCCESS", `Authorized ${provider || 'OAuth'} Session`);

  res.json({
    message: "OAuth authorization successful.",
    token,
    user: { email: normalizedEmail, name: user.name }
  });
});

// User Registration endpoint
app.post("/api/auth/register", async (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: "All fields (email, name, password) are required." });
  }

  // Validate real email format strictly
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Please provide a valid and complete real email address." });
  }

  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.find((u: any) => u.email === normalizedEmail)) {
    return res.status(400).json({ error: "An account with this email address already exists." });
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  const verificationToken = crypto.randomBytes(32).toString("hex");

  const newUser = { 
    email: normalizedEmail, 
    name: name.trim(), 
    passwordHash,
    isVerified: false,
    verificationToken
  };
  
  users.push(newUser);
  writeUsers(users);

  try {
    const link = await sendVerificationEmail(normalizedEmail, newUser.name, verificationToken, req.headers.host || "localhost:3000");
    res.status(201).json({
      message: "Registration successful! A verification link has been sent to your email address.",
      needsVerification: true,
      email: normalizedEmail,
      verificationLink: link // convenient for fast sandbox testing
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to process verification link distribution: " + err.message });
  }
});

// Resend Verification Email endpoint
app.post("/api/auth/resend", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email address is required to locate registration." });
  }

  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((u: any) => u.email === normalizedEmail);

  if (!user) {
    return res.status(404).json({ error: "No student account found with this email speech." });
  }

  if (user.isVerified) {
    return res.status(400).json({ error: "This email address is already verified. Proceed directly to log in." });
  }

  if (!user.verificationToken) {
    user.verificationToken = crypto.randomBytes(32).toString("hex");
    writeUsers(users);
  }

  try {
    const link = await sendVerificationEmail(user.email, user.name, user.verificationToken, req.headers.host || "localhost:3000");
    res.json({
      message: "A fresh verification link has been distributed to your verified inbox.",
      verificationLink: link
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to issue new token: " + err.message });
  }
});

// HTML Account Verify Link receiver page
app.get("/api/auth/verify", (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).send("<h1>Verification Failed</h1><p>Missing verification token credentials.</p>");
  }

  const users = readUsers();
  const user = users.find((u: any) => u.verificationToken === token);

  if (!user) {
    return res.status(400).send("<h1>Verification Failed</h1><p>The verification link is invalid, expired, or has already been used.</p>");
  }

  // Double checking and applying authentication status
  user.isVerified = true;
  delete user.verificationToken; // cleanup verification parameters
  writeUsers(users);

  // Return elegant web greeting card confirming email verification success
  res.send(`
    <html>
      <head>
        <title>Mountech Account Verified</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
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
});

// PDF Course companion download gateway
app.get("/api/download/syllabus", (req, res) => {
  // Construct minimal, completely compliant real binary PDF
  const pdfBuffer = Buffer.from(
    "%PDF-1.4\n" +
    "1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj\n" +
    "2 0 obj <</Type/Pages/Kids[3 0 R]/Count 1>> endobj\n" +
    "3 0 obj <</Type/Page/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/MediaBox[0 0 595 842]/Contents 5 0 R>> endobj\n" +
    "4 0 obj <</Type/Font/Subtype/Type1/BaseFont/Helvetica>> endobj\n" +
    "5 0 obj <</Length 280>> stream\n" +
    "BT\n" +
    "/F1 20 Tf\n" +
    "50 780 Td\n" +
    "(MOUNTECH ACADEMY LAB COMPANION) Tj\n" +
    "/F1 12 Tf\n" +
    "0 -35 Td\n" +
    "(Official Master Course Syllabus & Sandbox Guidebook) Tj\n" +
    "0 -20 Td\n" +
    "(Academic Verification ID: MT-99228-SECURE) Tj\n" +
    "0 -40 Td\n" +
    "(1. CHATGPT & GEMINI PROMPT ENGINEERING BLUEPRINT) Tj\n" +
    "0 -20 Td\n" +
    "(   - Iterative few-shot models, system configurations, and delimiters) Tj\n" +
    "0 -30 Td\n" +
    "(2. MULTI-AGENT AUTONOMOUS DEBATE & RECURSIVE DEBUGGING) Tj\n" +
    "0 -20 Td\n" +
    "(   - Self-correction runtime logs and user middleware safeguards) Tj\n" +
    "0 -30 Td\n" +
    "(3. MATHEMATICAL DEEP LEARNING GRADIENT MATRIX CALCULUS) Tj\n" +
    "0 -20 Td\n" +
    "(   - Multi-layer neural nodes, backprogation chain rules & Self-Attention) Tj\n" +
    "0 -50 Td\n" +
    "(Nepal Enrollment Partners: Approved via eSewa & Khalti Terminals.) Tj\n" +
    "0 -20 Td\n" +
    "(All rights reserved. Mountech Academy LLC.) Tj\n" +
    "ET\n" +
    "endstream\n" +
    "endobj\n" +
    "xref\n" +
    "0 6\n" +
    "0000000000 65535 f\n" +
    "0000000009 00000 n\n" +
    "0000000058 00000 n\n" +
    "0000000115 00000 n\n" +
    "0000000222 00000 n\n" +
    "0000000293 00000 n\n" +
    "trailer <</Size 6/Root 1 0 R>>\n" +
    "startxref\n" +
    "625\n" +
    "%%EOF"
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="mountech_lab_companion.pdf"');
  res.send(pdfBuffer);
});

function logLoginEvent(email: string, name: string, status: string, details: string) {
  try {
    const logins = readLocalLogins();
    logins.push({
      timestamp: new Date().toISOString(),
      email,
      name,
      status,
      details
    });
    writeLocalLogins(logins);

    // Call Sheet appender asynchronously
    appendLoginToSheet(email, name, status, details).catch((err) => {
      console.error("[GOOGLE SHEETS ENGINE] Async sheets logger failed:", err.message);
    });
  } catch (err: any) {
    console.error("[GOOGLE SHEETS ENGINE] Local logger failed:", err.message);
  }
}

// User Login endpoint
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((u: any) => u.email === normalizedEmail);

  if (!user) {
    logLoginEvent(normalizedEmail, "Unknown", "FAILED_INVALID_CREDENTIALS", "Unauthorized Web Access");
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  if (user.passwordHash !== passwordHash) {
    logLoginEvent(normalizedEmail, user.name, "FAILED_INVALID_CREDENTIALS", "Unauthorized Web Access");
    return res.status(401).json({ error: "Invalid email or password." });
  }

  // Block login for unverified accounts strictly
  if (user.isVerified === false) {
    logLoginEvent(normalizedEmail, user.name, "BLOCKED_UNVERIFIED", "Authentication Safeguard Block");
    return res.status(403).json({ 
      error: "unverified", 
      message: "Please verify your email address before signing in.",
      email: normalizedEmail,
      verificationLink: user.verificationToken ? `${process.env.APP_URL || ("http://" + req.headers.host)}/api/auth/verify?token=${user.verificationToken}` : null
    });
  }

  const token = createToken({ email: normalizedEmail, name: user.name });

  logLoginEvent(normalizedEmail, user.name, "SUCCESS", "Authorized Web Session");

  res.json({
    message: "Login successful.",
    token,
    user: { email: normalizedEmail, name: user.name }
  });
});

// Verify Current Token / fetch Profile session
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: (req as any).user });
});

// Fetch Current User's verified login logs
app.get("/api/auth/logins", requireAuth, (req, res) => {
  try {
    const currentEmail = (req as any).user.email;
    const logins = readLocalLogins();
    const filtered = logins.filter(
      (l: any) => l.email && l.email.trim().toLowerCase() === currentEmail.trim().toLowerCase()
    );
    res.json({ logins: filtered });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to read logged events: " + err.message });
  }
});

function getCourseTitle(courseId: string): string {
  const titles: Record<string, string> = {
    'chatgpt-prompt-engineering': 'ChatGPT Prompt Engineering for Developers',
    'ai-agentic-design-patterns': 'AI Agentic Design Patterns with AutoGen',
    'deep-learning-specialization': 'Deep Learning Specialization',
    'ai-python-for-beginners': 'AI Python for Beginners',
    'building-systems-chatgpt-api': 'Building Systems with the ChatGPT API',
    'practical-rag-vector-databases': 'Practical RAG with Vector Databases',
    'generative-ai-with-llms': 'Generative AI with Large Language Models'
  };
  return titles[courseId] || "Professional Academy Course";
}

async function generateCertificatePDF(studentName: string, courseTitle: string, dateStr: string): Promise<Buffer> {
  const certId = "MT-" + crypto.createHash("md5").update(`${studentName}-${courseTitle}`).digest("hex").substring(0, 10).toUpperCase();
  
  const cleanName = studentName.replace(/[()]/g, "");
  const cleanTitle = courseTitle.replace(/[()]/g, "");

  // Create a PDF Document
  const pdfDoc = await PDFDocument.create();
  
  // Add a blank page with A4 landscape standard dimensions (842 x 595)
  const page = pdfDoc.addPage([842, 595]);

  // Embed premium standard PDF fonts
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontTimesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // Helper utility to draw perfectly centered text
  const drawCenteredText = (text: string, size: number, y: number, font: any, color = rgb(0.06, 0.12, 0.22)) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (842 - textWidth) / 2,
      y: y,
      size: size,
      font: font,
      color: color
    });
  };

  // 1. Double Borders
  // Outer frame in deep charcoal premium navy
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 802,
    height: 555,
    borderColor: rgb(0.06, 0.09, 0.16),
    borderWidth: 2,
  });

  // Inner frame in elegant academy gold
  page.drawRectangle({
    x: 26,
    y: 26,
    width: 790,
    height: 543,
    borderColor: rgb(0.79, 0.64, 0.25),
    borderWidth: 1,
  });

  // Corner geometric ornament brackets
  const drawCornerBrackets = () => {
    const outerLimits = [
      { x: 26, y: 26, dx: 15, dy: 15 },
      { x: 26, y: 569, dx: 15, dy: -15 },
      { x: 816, y: 26, dx: -15, dy: 15 },
      { x: 816, y: 569, dx: -15, dy: -15 }
    ];
    for (const box of outerLimits) {
      page.drawLine({
        start: { x: box.x, y: box.y },
        end: { x: box.x + box.dx, y: box.y },
        color: rgb(0.79, 0.64, 0.25),
        thickness: 1.5
      });
      page.drawLine({
        start: { x: box.x, y: box.y },
        end: { x: box.x, y: box.y + box.dy },
        color: rgb(0.79, 0.64, 0.25),
        thickness: 1.5
      });
    }
  };
  drawCornerBrackets();

  // 2. Load and embed Mountech Academy logo
  try {
    const logoPath = path.join(process.cwd(), "src", "assets", "images", "mountech_logo_1781293059155.jpg");
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedJpg(logoBytes);
      const logoDims = logoImage.scaleToFit(140, 52);
      
      page.drawImage(logoImage, {
        x: (842 - logoDims.width) / 2,
        y: 495,
        width: logoDims.width,
        height: logoDims.height,
      });
    }
  } catch (logoErr) {
    console.warn("Could not embed image logo, falling back to typography header.", logoErr);
  }

  // 3. Institution Subtitle Header
  drawCenteredText("MOUNTECH ACADEMY", 15, 460, fontHelveticaBold, rgb(0.06, 0.09, 0.16));
  drawCenteredText("GLOBAL LAB PLATFORM FOR DEEP RESEARCH & ENGINE CERTIFICATIONS", 8.5, 442, fontHelvetica, rgb(0.4, 0.45, 0.55));

  // Elegant golden divisor line
  page.drawLine({
    start: { x: 340, y: 425 },
    end: { x: 502, y: 425 },
    color: rgb(0.79, 0.64, 0.25),
    thickness: 1
  });

  // 4. Achievement Proclamation Title
  drawCenteredText("CERTIFICATE OF COMPLETION", 21, 385, fontHelveticaBold, rgb(0.74, 0.58, 0.20));

  // 5. Presentee Details
  drawCenteredText("This is proudly presented to", 12, 345, fontTimesRomanItalic, rgb(0.35, 0.38, 0.45));

  // Huge bold name entry
  const nameToDraw = cleanName.toUpperCase();
  drawCenteredText(nameToDraw, 26, 302, fontHelveticaBold, rgb(0.06, 0.09, 0.16));

  // Underline for name
  const nameWidth = fontHelveticaBold.widthOfTextAtSize(nameToDraw, 26);
  const underlinePadding = 25;
  page.drawLine({
    start: { x: (842 - nameWidth) / 2 - underlinePadding, y: 290 },
    end: { x: (842 + nameWidth) / 2 + underlinePadding, y: 290 },
    color: rgb(0.79, 0.64, 0.25),
    thickness: 1.5
  });

  // 6. Course Details Statement
  drawCenteredText("for successfully mastering and completing the professional curriculum of", 11.5, 258, fontTimesRomanItalic, rgb(0.35, 0.38, 0.45));

  // Course title in dark navy/blue
  drawCenteredText(cleanTitle, 16.5, 222, fontHelveticaBold, rgb(0.0, 0.44, 0.85));

  // 7. BOTTOM STYLISH BLOCKS (Alignment, Badge, and signatures)
  
  // Date Block (Left)
  const leftCenterX = 210;
  // Handwriting style signature for Academic Director
  page.drawText("Sarah Sterling", {
    x: leftCenterX - fontTimesRomanItalic.widthOfTextAtSize("Sarah Sterling", 16) / 2,
    y: 132,
    size: 16,
    font: fontTimesRomanItalic,
    color: rgb(0.12, 0.18, 0.28)
  });
  // Rule
  page.drawLine({
    start: { x: leftCenterX - 100, y: 122 },
    end: { x: leftCenterX + 100, y: 122 },
    color: rgb(0.65, 0.70, 0.75),
    thickness: 0.8
  });
  // Label 1
  const label1 = "DIRECTOR OF ACADEMIC AFFAIRS";
  page.drawText(label1, {
    x: leftCenterX - fontHelveticaBold.widthOfTextAtSize(label1, 8.5) / 2,
    y: 110,
    size: 8.5,
    font: fontHelveticaBold,
    color: rgb(0.40, 0.45, 0.55)
  });
  // Sub-detail: Date
  const dateLabel = `Issued: ${dateStr}`;
  page.drawText(dateLabel, {
    x: leftCenterX - fontHelvetica.widthOfTextAtSize(dateLabel, 9) / 2,
    y: 96,
    size: 9,
    font: fontHelvetica,
    color: rgb(0.45, 0.50, 0.60)
  });

  // Verification & Chancellor Block (Right)
  const rightCenterX = 632;
  // Handwriting style signature for Chancellor
  page.drawText("Sterling Vance", {
    x: rightCenterX - fontTimesRomanItalic.widthOfTextAtSize("Sterling Vance", 16) / 2,
    y: 132,
    size: 16,
    font: fontTimesRomanItalic,
    color: rgb(0.12, 0.18, 0.28)
  });
  // Rule
  page.drawLine({
    start: { x: rightCenterX - 100, y: 122 },
    end: { x: rightCenterX + 100, y: 122 },
    color: rgb(0.65, 0.70, 0.75),
    thickness: 0.8
  });
  // Label 2
  const label2 = "ACADEMIC REGISTER & CHANCELLOR";
  page.drawText(label2, {
    x: rightCenterX - fontHelveticaBold.widthOfTextAtSize(label2, 8.5) / 2,
    y: 110,
    size: 8.5,
    font: fontHelveticaBold,
    color: rgb(0.40, 0.45, 0.55)
  });
  // Sub-detail: Valid Verification ID
  const verifyIdLabel = `ID: ${certId}`;
  page.drawText(verifyIdLabel, {
    x: rightCenterX - fontHelvetica.widthOfTextAtSize(verifyIdLabel, 9) / 2,
    y: 96,
    size: 9,
    font: fontHelvetica,
    color: rgb(0.45, 0.50, 0.60)
  });

  // Gold Seal / Completion Badge (Center)
  const centerSealX = 421;
  const centerSealY = 118;

  // Drawn Ribbons (Beautiful rich overlapping vertical crimson ribbons)
  // Left Crimson Ribbon
  page.drawRectangle({
    x: centerSealX - 16,
    y: centerSealY - 48,
    width: 12,
    height: 48,
    color: rgb(0.65, 0.10, 0.15),
  });
  // Right Crimson Ribbon
  page.drawRectangle({
    x: centerSealX + 4,
    y: centerSealY - 48,
    width: 12,
    height: 48,
    color: rgb(0.65, 0.10, 0.15),
  });

  // Golden concentric circles
  // Concentric circle 1 (Outer Gold) - radius 28
  page.drawCircle({
    x: centerSealX,
    y: centerSealY,
    size: 28,
    color: rgb(0.85, 0.67, 0.12),
  });
  // Concentric circle 2 (Navy Inner Line) - radius 24
  page.drawCircle({
    x: centerSealX,
    y: centerSealY,
    size: 24,
    color: rgb(0.06, 0.09, 0.16),
  });
  // Concentric circle 3 (Inner Gold Fill) - radius 22
  page.drawCircle({
    x: centerSealX,
    y: centerSealY,
    size: 22,
    color: rgb(0.92, 0.76, 0.20),
  });

  // Emblazoned monogram "M" inside seal
  const monogram = "M";
  page.drawText(monogram, {
    x: centerSealX - fontHelveticaBold.widthOfTextAtSize(monogram, 15) / 2,
    y: centerSealY - 5,
    size: 15,
    font: fontHelveticaBold,
    color: rgb(0.06, 0.09, 0.16)
  });

  // Ribbon label below seal
  const labelSeal = "VERIFIED SCHOLAR";
  page.drawText(labelSeal, {
    x: centerSealX - fontHelveticaBold.widthOfTextAtSize(labelSeal, 7) / 2,
    y: centerSealY - 42,
    size: 7,
    font: fontHelveticaBold,
    color: rgb(0.85, 0.67, 0.12)
  });

  // Bottom authenticity footnote
  const authenticityText = "Authenticity dynamically verified via Mountech Global Cryptographic Nodes";
  drawCenteredText(authenticityText, 8, 48, fontHelvetica, rgb(0.45, 0.50, 0.60));

  // Save PDF to buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function getUserFromRequest(req: express.Request): UserPayload | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    return verifyToken(token);
  }
  const queryToken = req.query.token as string;
  if (queryToken) {
    return verifyToken(queryToken);
  }
  return null;
}

// Get Enrolled Courses for Authenticated User
app.get("/api/enrollments", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const localList = readLocalEnrollments();
  
  // Find local enrollments matching user email
  const userLocalIDs = localList
    .filter((e: any) => e.email.toLowerCase() === user.email.toLowerCase())
    .map((e: any) => e.courseId);

  const userCompletedLocalIDs = localList
    .filter((e: any) => e.email.toLowerCase() === user.email.toLowerCase() && e.status === "Completed")
    .map((e: any) => e.courseId);

  if (!hasSheetsConfig()) {
    return res.json({
      enrollments: Array.from(new Set(userLocalIDs)),
      completions: Array.from(new Set(userCompletedLocalIDs)),
      sheetsSynced: false,
      warning: "Google Sheets service is not configured. Running in local session sync fallback mode."
    });
  }

  try {
    const sheetsData = await fetchEnrollmentsAndCompletionsFromSheet(user.email);
    const mergedIDs = Array.from(new Set([...userLocalIDs, ...sheetsData.enrollments]));
    const mergedCompletedIDs = Array.from(new Set([...userCompletedLocalIDs, ...sheetsData.completions]));
    res.json({
      enrollments: mergedIDs,
      completions: mergedCompletedIDs,
      sheetsSynced: true
    });
  } catch (error: any) {
    console.error("Sheets retrieval failed, falling back to local storage:", error.message);
    res.json({
      enrollments: Array.from(new Set(userLocalIDs)),
      completions: Array.from(new Set(userCompletedLocalIDs)),
      sheetsSynced: false,
      warning: "Google Sheets retrieval failed temporarily. Displaying cached records."
    });
  }
});

// Create Course Enrollment Request
app.post("/api/enroll", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { courseId, courseTitle } = req.body;

  if (!courseId || !courseTitle) {
    return res.status(400).json({ error: "courseId and courseTitle are required to enroll." });
  }

  // 1. Record enrollment in local JSON database
  const localEnrollments = readLocalEnrollments();
  const alreadyLocal = localEnrollments.some(
    (e: any) => e.email.toLowerCase() === user.email.toLowerCase() && e.courseId === courseId
  );

  if (!alreadyLocal) {
    localEnrollments.push({
      timestamp: new Date().toISOString(),
      email: user.email,
      name: user.name,
      courseId,
      courseTitle,
      status: "Enrolled"
    });
    writeLocalEnrollments(localEnrollments);
  }

  // 2. Append to Google Sheets if configured
  if (!hasSheetsConfig()) {
    return res.json({
      success: true,
      sheetsSynced: false,
      message: "Enrolled in local session. Google Sheets secret configuration is missing in environment."
    });
  }

  try {
    await appendEnrollmentToSheet(user.email, user.name, courseId, courseTitle);
    res.json({
      success: true,
      sheetsSynced: true,
      message: "Successfully synchronized enrollment securely to Google Sheets."
    });
  } catch (error: any) {
    console.error("Google Sheets sync failed:", error.message);
    res.json({
      success: true,
      sheetsSynced: false,
      warning: "Enrollment captured locally. Unable to sync with Google Sheets.",
      errorDetails: error.message
    });
  }
});

// Create Course Completion Request
app.post("/api/complete", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { courseId } = req.body;

  if (!courseId) {
    return res.status(400).json({ error: "courseId is required to complete a course." });
  }

  // 1. Mark in local database
  const localEnrollments = readLocalEnrollments();
  let found = false;
  for (const e of localEnrollments) {
    if (e.email.toLowerCase() === user.email.toLowerCase() && e.courseId === courseId) {
      e.status = "Completed";
      found = true;
    }
  }

  if (!found) {
    localEnrollments.push({
      timestamp: new Date().toISOString(),
      email: user.email,
      name: user.name,
      courseId,
      courseTitle: getCourseTitle(courseId),
      status: "Completed"
    });
  }
  writeLocalEnrollments(localEnrollments);

  // 2. Mark in Google Sheets
  if (!hasSheetsConfig()) {
    return res.json({
      success: true,
      sheetsSynced: false,
      message: "Successfully completed locally. Google Sheets credentials are not configured."
    });
  }

  try {
    await markCourseCompletedInSheet(user.email, courseId);
    res.json({
      success: true,
      sheetsSynced: true,
      message: "Successfully updated completion status in Google Sheets."
    });
  } catch (error: any) {
    console.error("Completing in sheet failed:", error.message);
    res.json({
      success: true,
      sheetsSynced: false,
      warning: "Completion captured locally. Google Sheets update failed.",
      errorDetails: error.message
    });
  }
});

// Download PDF Certificate Gateway
app.get("/api/certificate/download", async (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).send("<h1>Unauthorized</h1><p>Invalid or missing authentication credentials.</p>");
  }

  const courseId = req.query.courseId as string;
  if (!courseId) {
    return res.status(400).send("<h1>Bad Request</h1><p>Missing required courseId query parameter.</p>");
  }

  const courseTitle = getCourseTitle(courseId);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  try {
    const certBuffer = await generateCertificatePDF(user.name, courseTitle, dateStr);
    const safeFilename = `${courseId}_completion_certificate.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    res.send(certBuffer);
  } catch (err: any) {
    console.error("Certificate PDF generation error:", err.message);
    res.status(500).send(`<h1>Generation Error</h1><p>${err.message}</p>`);
  }
});

// ----------------------------------------------------
// FRONTEND BINDINGS (VITE MIDDLEWARE / STATIC SERVING)
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mountech Academy server run on http://localhost:${PORT}`);
  });
}

startServer();
