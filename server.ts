import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { google } from "googleapis";
import { createServer as createViteServer } from "vite";
import dns from "dns";

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

// Local DB Controllers
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    // Seed default administrator / student demo account
    const defaultUsers = [
      {
        email: "student@mountech.academy",
        name: "Mountech Scholar",
        // Simple hash of 'password123'
        passwordHash: crypto.createHash("sha256").update("password123").digest("hex")
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

// Ensure database files are initialized on boot
readUsers();
readLocalEnrollments();

// Google Sheets Helpers
function hasSheetsConfig() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const id = process.env.GOOGLE_SHEET_ID;
  return !!(email && key && id);
}

async function appendEnrollmentToSheet(email: string, name: string, courseId: string, courseTitle: string) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

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
    range: "Sheet1!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[timestamp, email, name, courseId, courseTitle]],
    },
  });
}

async function fetchEnrollmentsFromSheet(email: string): Promise<string[]> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

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
    range: "Sheet1!A:E",
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    return [];
  }

  // Row format: [Timestamp, Email, Name, CourseID, CourseTitle]
  const list = rows
    .filter((row) => row[1] && row[1].trim().toLowerCase() === email.trim().toLowerCase())
    .map((row) => row[3]);

  return list;
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

// User Registration endpoint
app.post("/api/auth/register", (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: "All fields (email, name, password) are required." });
  }

  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.find((u: any) => u.email === normalizedEmail)) {
    return res.status(400).json({ error: "An account with this email address already exists." });
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  const newUser = { email: normalizedEmail, name: name.trim(), passwordHash };
  
  users.push(newUser);
  writeUsers(users);

  const token = createToken({ email: normalizedEmail, name: newUser.name });

  res.status(201).json({
    message: "Registration completed successfully.",
    token,
    user: { email: normalizedEmail, name: newUser.name }
  });
});

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
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  if (user.passwordHash !== passwordHash) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = createToken({ email: normalizedEmail, name: user.name });

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

// Get Enrolled Courses for Authenticated User
app.get("/api/enrollments", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const localList = readLocalEnrollments();
  
  // Find local enrollments matching user email
  const userLocalIDs = localList
    .filter((e: any) => e.email.toLowerCase() === user.email.toLowerCase())
    .map((e: any) => e.courseId);

  if (!hasSheetsConfig()) {
    return res.json({
      enrollments: Array.from(new Set(userLocalIDs)),
      sheetsSynced: false,
      warning: "Google Sheets service is not configured. Running in local session sync fallback mode."
    });
  }

  try {
    const sheetsIDs = await fetchEnrollmentsFromSheet(user.email);
    // Combine local and sheet records for high fault tolerance
    const mergedIDs = Array.from(new Set([...userLocalIDs, ...sheetsIDs]));
    res.json({
      enrollments: mergedIDs,
      sheetsSynced: true
    });
  } catch (error: any) {
    console.error("Sheets retrieval failed, falling back to local storage:", error.message);
    res.json({
      enrollments: Array.from(new Set(userLocalIDs)),
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
      courseTitle
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
    res.status(255).json({
      success: true,
      sheetsSynced: false,
      warning: "Enrollment captured locally. Unable to sync with Google Sheets.",
      errorDetails: error.message
    });
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
