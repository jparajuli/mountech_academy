import { Request, Response } from "express";
import crypto from "crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import path from "path";
import fs from "fs";
import db from "../db/database.js";
import { verifyToken } from "../middlewares/auth.js";
import {
  appendEnrollmentToSheet,
  fetchEnrollmentsAndCompletionsFromSheet,
  hasSheetsConfig,
  logSheetError,
  markCourseCompletedInSheet,
} from "../utils/sheets.js";
import { sendEmail } from "../utils/mailer.js";


function getCourseTitle(courseId: string): string {
  const titles: Record<string, string> = {
    "chatgpt-prompt-engineering": "ChatGPT Prompt Engineering for Developers",
    "ai-agentic-design-patterns": "AI Agentic Design Patterns with AutoGen",
    "deep-learning-specialization": "Deep Learning Specialization",
    "ai-python-for-beginners": "AI Python for Beginners",
    "building-systems-chatgpt-api": "Building Systems with the ChatGPT API",
    "practical-rag-vector-databases": "Practical RAG with Vector Databases",
    "generative-ai-with-llms": "Generative AI with Large Language Models",
  };
  return titles[courseId] || "Professional Academy Course";
}

async function generateCertificatePDF(studentName: string, courseTitle: string, dateStr: string): Promise<Buffer> {
  const certId = "MT-" + crypto.createHash("md5").update(`${studentName}-${courseTitle}`).digest("hex").substring(0, 10).toUpperCase();
  
  const cleanName = studentName.replace(/[()]/g, "");
  const cleanTitle = courseTitle.replace(/[()]/g, "");

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]);

  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontTimesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

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

  // Outer border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 802,
    height: 555,
    borderColor: rgb(0.06, 0.09, 0.16),
    borderWidth: 2,
  });

  // Inner border
  page.drawRectangle({
    x: 26,
    y: 26,
    width: 790,
    height: 543,
    borderColor: rgb(0.79, 0.64, 0.25),
    borderWidth: 1,
  });

  // Corner geometric ornament brackets
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

  // Logo embedment
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

  drawCenteredText("MOUNTECH ACADEMY", 15, 460, fontHelveticaBold, rgb(0.06, 0.09, 0.16));
  drawCenteredText("GLOBAL LAB PLATFORM FOR DEEP RESEARCH & ENGINE CERTIFICATIONS", 8.5, 442, fontHelvetica, rgb(0.4, 0.45, 0.55));

  page.drawLine({
    start: { x: 340, y: 425 },
    end: { x: 502, y: 425 },
    color: rgb(0.79, 0.64, 0.25),
    thickness: 1
  });

  drawCenteredText("CERTIFICATE OF COMPLETION", 21, 385, fontHelveticaBold, rgb(0.74, 0.58, 0.20));
  drawCenteredText("This is proudly presented to", 12, 345, fontTimesRomanItalic, rgb(0.35, 0.38, 0.45));

  const nameToDraw = cleanName.toUpperCase();
  drawCenteredText(nameToDraw, 26, 302, fontHelveticaBold, rgb(0.06, 0.09, 0.16));

  const nameWidth = fontHelveticaBold.widthOfTextAtSize(nameToDraw, 26);
  const underlinePadding = 25;
  page.drawLine({
    start: { x: (842 - nameWidth) / 2 - underlinePadding, y: 290 },
    end: { x: (842 + nameWidth) / 2 + underlinePadding, y: 290 },
    color: rgb(0.79, 0.64, 0.25),
    thickness: 1.5
  });

  drawCenteredText("for successfully mastering and completing the professional curriculum of", 11.5, 258, fontTimesRomanItalic, rgb(0.35, 0.38, 0.45));
  drawCenteredText(cleanTitle, 16.5, 222, fontHelveticaBold, rgb(0.0, 0.44, 0.85));

  // Signatures date
  const leftCenterX = 210;
  page.drawText("Sarah Sterling", {
    x: leftCenterX - fontTimesRomanItalic.widthOfTextAtSize("Sarah Sterling", 16) / 2,
    y: 132,
    size: 16,
    font: fontTimesRomanItalic,
    color: rgb(0.12, 0.18, 0.28)
  });
  page.drawLine({
    start: { x: leftCenterX - 100, y: 122 },
    end: { x: leftCenterX + 100, y: 122 },
    color: rgb(0.65, 0.70, 0.75),
    thickness: 0.8
  });
  const label1 = "DIRECTOR OF ACADEMIC AFFAIRS";
  page.drawText(label1, {
    x: leftCenterX - fontHelveticaBold.widthOfTextAtSize(label1, 8.5) / 2,
    y: 110,
    size: 8.5,
    font: fontHelveticaBold,
    color: rgb(0.40, 0.45, 0.55)
  });
  const dateLabel = `Issued: ${dateStr}`;
  page.drawText(dateLabel, {
    x: leftCenterX - fontHelvetica.widthOfTextAtSize(dateLabel, 9) / 2,
    y: 96,
    size: 9,
    font: fontHelvetica,
    color: rgb(0.45, 0.50, 0.60)
  });

  // Right Block
  const rightCenterX = 632;
  page.drawText("Sterling Vance", {
    x: rightCenterX - fontTimesRomanItalic.widthOfTextAtSize("Sterling Vance", 16) / 2,
    y: 132,
    size: 16,
    font: fontTimesRomanItalic,
    color: rgb(0.12, 0.18, 0.28)
  });
  page.drawLine({
    start: { x: rightCenterX - 100, y: 122 },
    end: { x: rightCenterX + 100, y: 122 },
    color: rgb(0.65, 0.70, 0.75),
    thickness: 0.8
  });
  const label2 = "ACADEMIC REGISTER & CHANCELLOR";
  page.drawText(label2, {
    x: rightCenterX - fontHelveticaBold.widthOfTextAtSize(label2, 8.5) / 2,
    y: 110,
    size: 8.5,
    font: fontHelveticaBold,
    color: rgb(0.40, 0.45, 0.55)
  });
  const verifyIdLabel = `ID: ${certId}`;
  page.drawText(verifyIdLabel, {
    x: rightCenterX - fontHelvetica.widthOfTextAtSize(verifyIdLabel, 9) / 2,
    y: 96,
    size: 9,
    font: fontHelvetica,
    color: rgb(0.45, 0.50, 0.60)
  });

  // Seal badge
  const centerSealX = 421;
  const centerSealY = 118;
  page.drawRectangle({
    x: centerSealX - 16,
    y: centerSealY - 48,
    width: 12,
    height: 48,
    color: rgb(0.65, 0.10, 0.15),
  });
  page.drawRectangle({
    x: centerSealX + 4,
    y: centerSealY - 48,
    width: 12,
    height: 48,
    color: rgb(0.65, 0.10, 0.15),
  });
  page.drawCircle({
    x: centerSealX,
    y: centerSealY,
    size: 28,
    color: rgb(0.85, 0.67, 0.12),
  });
  page.drawCircle({
    x: centerSealX,
    y: centerSealY,
    size: 24,
    color: rgb(0.06, 0.09, 0.16),
  });
  page.drawCircle({
    x: centerSealX,
    y: centerSealY,
    size: 22,
    color: rgb(0.92, 0.76, 0.20),
  });
  const monogram = "M";
  page.drawText(monogram, {
    x: centerSealX - fontHelveticaBold.widthOfTextAtSize(monogram, 15) / 2,
    y: centerSealY - 5,
    size: 15,
    font: fontHelveticaBold,
    color: rgb(0.06, 0.09, 0.16)
  });
  const labelSeal = "VERIFIED SCHOLAR";
  page.drawText(labelSeal, {
    x: centerSealX - fontHelveticaBold.widthOfTextAtSize(labelSeal, 7) / 2,
    y: centerSealY - 42,
    size: 7,
    font: fontHelveticaBold,
    color: rgb(0.85, 0.67, 0.12)
  });

  const authenticityText = "Authenticity dynamically verified via Mountech Global Cryptographic Nodes";
  drawCenteredText(authenticityText, 8, 48, fontHelvetica, rgb(0.45, 0.50, 0.60));

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Serves the academic master handbook
export function getSyllabus(req: Request, res: Response) {
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
  return res.send(pdfBuffer);
}

// Get Enrolled Courses list for authenticated user
export async function getEnrollments(req: Request, res: Response) {
  const user = (req as any).user;
  const normalizedEmail = user.email.trim().toLowerCase();

  try {
    const localEnrollments = db.prepare("SELECT * FROM enrollments WHERE email = ?").all(normalizedEmail) as any[];
    const userLocalIDs = localEnrollments.map((e) => e.courseId);
    const userCompletedLocalIDs = localEnrollments.filter((e) => e.status === "Completed").map((e) => e.courseId);

    if (!hasSheetsConfig()) {
      return res.json({
        enrollments: Array.from(new Set(userLocalIDs)),
        completions: Array.from(new Set(userCompletedLocalIDs)),
        sheetsSynced: false,
        warning: "Google Sheets service is not configured. Running in local session sync fallback mode."
      });
    }

    const sheetsData = await fetchEnrollmentsAndCompletionsFromSheet(normalizedEmail);
    const mergedIDs = Array.from(new Set([...userLocalIDs, ...sheetsData.enrollments]));
    const mergedCompletedIDs = Array.from(new Set([...userCompletedLocalIDs, ...sheetsData.completions]));
    
    return res.json({
      enrollments: mergedIDs,
      completions: mergedCompletedIDs,
      sheetsSynced: true
    });
  } catch (error: any) {
    logSheetError("Sheets retrieval failed, falling back to local storage", error);
    // Dynamic query from local DB fallback indexings represent safe resilience
    const localEnrollments = db.prepare("SELECT * FROM enrollments WHERE email = ?").all(normalizedEmail) as any[];
    const userLocalIDs = localEnrollments.map((e) => e.courseId);
    const userCompletedLocalIDs = localEnrollments.filter((e) => e.status === "Completed").map((e) => e.courseId);

    return res.json({
      enrollments: Array.from(new Set(userLocalIDs)),
      completions: Array.from(new Set(userCompletedLocalIDs)),
      sheetsSynced: false,
      warning: "Google Sheets retrieval failed temporarily. Displaying cached records."
    });
  }
}

// Enroll in a Course request
export async function enroll(req: Request, res: Response) {
  const user = (req as any).user;
  const { courseId, courseTitle } = req.body;
  const normalizedEmail = user.email.trim().toLowerCase();

  try {
    // 1. Record enrollment in SQLite database
    const alreadyEnrolled = db.prepare(`
      SELECT 1 FROM enrollments WHERE email = ? AND courseId = ?
    `).get(normalizedEmail, courseId);

    if (!alreadyEnrolled) {
      const insertStmt = db.prepare(`
        INSERT INTO enrollments (email, name, courseId, courseTitle, status, timestamp)
        VALUES (?, ?, ?, ?, 'Enrolled', ?)
      `);
      insertStmt.run(normalizedEmail, user.name, courseId, courseTitle, new Date().toISOString());

      // Dispatch automated confirmation email securely using nodemailer helper
      sendEmail(
        normalizedEmail,
        `Enrollment Confirmed: ${courseTitle} 🎓`,
        `
          <div style="font-family: 'Inter', system-ui, sans-serif; padding: 30px; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #0070f3; font-size: 24px; font-weight: 800; margin: 0; font-family: monospace;">MOUNTECH ACADEMY</h1>
              <p style="color: #6b7280; font-size: 11px; text-transform: uppercase; tracking-wider: 1px; margin: 5px 0 0 0;">Interactive Technology Certifications</p>
            </div>
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin-bottom: 20px;" />
            <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin-top: 0;">Enrollment Registration Success!</h2>
            <p>Dear <strong>${user.name}</strong>,</p>
            <p>Congratulations! Your academic registration has been received successfully. You have unlocked live access to the following classroom:</p>
            
            <div style="background: #f0f7ff; border-left: 4px solid #0070f3; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <strong style="font-size: 15px; color: #0050b3;">${courseTitle}</strong><br/>
              <span style="font-size: 11px; color: #6b7280; font-family: monospace; font-weight: 600;">Track Code: ${courseId}</span>
            </div>

            <p style="font-size: 13px; color: #4b5563;">
              To start attending sessions, access study materials uploaded by your course instructors, and complete assignments, visit the course page of your Scholar Catalog dashboard.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 25px 0;" />
            <p style="font-size: 11px; color: #9ca3af; line-height: 1.4; margin: 0;">
              This email was sent from an automated transactional mailing server. Replies to this address are not monitored.
            </p>
          </div>
        `
      ).catch(err => {
        console.error("[SMTP_CONFIRMATION_FAIL] Failed sending confirmation message:", err.message);
      });
    }

    if (!hasSheetsConfig()) {
      return res.json({
        success: true,
        sheetsSynced: false,
        message: "Enrolled in local session. Google Sheets secret configuration is missing in environment."
      });
    }

    await appendEnrollmentToSheet(normalizedEmail, user.name, courseId, courseTitle);
    return res.json({
      success: true,
      sheetsSynced: true,
      message: "Successfully synchronized enrollment securely to Google Sheets."
    });
  } catch (error: any) {
    logSheetError("Google Sheets sync failed", error);
    return res.json({
      success: true,
      sheetsSynced: false,
      warning: "Enrollment captured locally. Unable to sync with Google Sheets.",
      errorDetails: error.message
    });
  }
}

// Create Course Completion Request
export async function complete(req: Request, res: Response) {
  const user = (req as any).user;
  const { courseId } = req.body;
  const normalizedEmail = user.email.trim().toLowerCase();

  try {
    // 1. Mark in SQLite database
    const existing = db.prepare("SELECT id FROM enrollments WHERE email = ? AND courseId = ?").get(normalizedEmail, courseId);

    if (existing) {
      db.prepare("UPDATE enrollments SET status = 'Completed' WHERE email = ? AND courseId = ?").run(normalizedEmail, courseId);
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO enrollments (email, name, courseId, courseTitle, status, timestamp)
        VALUES (?, ?, ?, ?, 'Completed', ?)
      `);
      insertStmt.run(normalizedEmail, user.name, courseId, getCourseTitle(courseId), new Date().toISOString());
    }

    if (!hasSheetsConfig()) {
      return res.json({
        success: true,
        sheetsSynced: false,
        message: "Successfully completed locally. Google Sheets credentials are not configured."
      });
    }

    await markCourseCompletedInSheet(normalizedEmail, courseId);
    return res.json({
      success: true,
      sheetsSynced: true,
      message: "Successfully updated completion status in Google Sheets."
    });
  } catch (error: any) {
    logSheetError("Completing in sheet failed", error);
    return res.json({
      success: true,
      sheetsSynced: false,
      warning: "Completion captured locally. Google Sheets update failed.",
      errorDetails: error.message
    });
  }
}

// Download dynamic completion certificate
export async function certificateDownload(req: Request, res: Response) {
  // Query token verification fallback
  const authHeader = req.headers.authorization;
  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  const payload = verifyToken(token);
  if (!payload) {
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
    const certBuffer = await generateCertificatePDF(payload.name, courseTitle, dateStr);
    const safeFilename = `${courseId}_completion_certificate.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    return res.send(certBuffer);
  } catch (err: any) {
    console.error("Certificate PDF generation error:", err.message);
    return res.status(500).send(`<h1>Generation Error</h1><p>${err.message}</p>`);
  }
}

// Get course average rating and list
export function getRatings(req: Request, res: Response) {
  const { courseId } = req.params;

  try {
    const courseRatings = db.prepare("SELECT * FROM ratings WHERE courseId = ? ORDER BY timestamp DESC").all(courseId) as any[];
    const count = courseRatings.length;
    const average = count > 0 
      ? Math.round((courseRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    return res.json({
      ratings: courseRatings,
      average,
      count
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to read rating reviews: " + err.message });
  }
}

// Submit a star rating for a course
export function submitRating(req: Request, res: Response) {
  const user = (req as any).user;
  const { courseId, rating, review } = req.body;
  const normalizedEmail = user.email.trim().toLowerCase();

  try {
    // Check if the user already submitted a rating for this course
    const existing = db.prepare("SELECT id FROM ratings WHERE courseId = ? AND email = ?").get(courseId, normalizedEmail) as any;
    const ratingId = existing ? existing.id : crypto.randomBytes(8).toString("hex");

    const newRating = {
      id: ratingId,
      courseId,
      email: normalizedEmail,
      name: user.name,
      rating,
      review: (review || "").trim(),
      timestamp: new Date().toISOString()
    };

    db.prepare(`
      INSERT OR REPLACE INTO ratings (id, courseId, email, name, rating, review, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      newRating.id,
      newRating.courseId,
      newRating.email,
      newRating.name,
      newRating.rating,
      newRating.review,
      newRating.timestamp
    );

    return res.json({
      success: true,
      message: "Thank you! Your rating has been recorded successfully.",
      rating: newRating
    });
  } catch (err: any) {
    console.error("[SUBMIT RATING ERR]", err);
    return res.status(500).json({ error: "Failed to record star review: " + err.message });
  }
}

// List all courses from database (Public: returned where is_locked = 0 only)
export function listCourses(req: Request, res: Response) {
  try {
    const rows = db.prepare(`
      SELECT c.*,
             json_group_array(
               json_object(
                 'id', ip.id,
                 'name', ip.full_name,
                 'title', ip.academic_title,
                 'avatar', ip.avatar_url,
                 'display_order', ci.display_order
               )
             ) AS instructors_json
      FROM courses c
      LEFT JOIN course_instructors ci ON c.id = ci.course_id
      LEFT JOIN instructor_profiles ip ON ci.instructor_profile_id = ip.id
      WHERE c.is_locked = 0
      GROUP BY c.id
    `).all() as any[];
    const courses = rows.map((r) => {
      let instructors: any[] = [];
      try {
        const parsed = JSON.parse(r.instructors_json);
        if (Array.isArray(parsed)) {
          instructors = parsed.filter((inst: any) => inst && inst.id !== null);
          instructors.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        }
      } catch (err) {
        instructors = [];
      }

      const primaryInst = instructors[0] || null;

      return {
        id: r.id,
        title: r.title,
        type: r.type,
        difficulty: r.difficulty,
        topic: r.topic,
        description: r.description,
        fullDescription: r.fullDescription,
        instructorName: primaryInst ? primaryInst.name : r.instructorName,
        instructorTitle: primaryInst ? primaryInst.title : r.instructorTitle,
        duration: r.duration,
        lessonCount: r.lessonCount,
        rating: r.rating,
        enrolledCount: r.enrolledCount,
        partnerName: r.partnerName,
        skillsAcquired: JSON.parse(r.skillsAcquired || "[]"),
        requirements: JSON.parse(r.requirements || "[]"),
        syllabus: JSON.parse(r.syllabus || "[]"),
        thumbnailBg: r.thumbnailBg,
        thumbnailIconCode: r.thumbnailIconCode,
        isPaid: r.isPaid === 1,
        price: r.price,
        isLocked: r.is_locked === 1,
        instructors: instructors.map(i => ({ id: i.id, name: i.name, title: i.title, avatar: i.avatar })),
        instructor: primaryInst ? {
          name: primaryInst.name,
          title: primaryInst.title,
          avatar: primaryInst.avatar
        } : null
      };
    });
    return res.json({ success: true, courses });
  } catch (err: any) {
    console.error("[GET COURSES ERR]", err);
    return res.status(500).json({ error: "Failed to retrieve courses database index: " + err.message });
  }
}

// List all courses for Admin (Returns all courses including locked ones)
export function listAdminCourses(req: Request, res: Response) {
  try {
    const rows = db.prepare(`
      SELECT c.*,
             json_group_array(
               json_object(
                 'id', ip.id,
                 'name', ip.full_name,
                 'title', ip.academic_title,
                 'avatar', ip.avatar_url,
                 'display_order', ci.display_order
               )
             ) AS instructors_json
      FROM courses c
      LEFT JOIN course_instructors ci ON c.id = ci.course_id
      LEFT JOIN instructor_profiles ip ON ci.instructor_profile_id = ip.id
      GROUP BY c.id
    `).all() as any[];
    const courses = rows.map((r) => {
      let instructors: any[] = [];
      try {
        const parsed = JSON.parse(r.instructors_json);
        if (Array.isArray(parsed)) {
          instructors = parsed.filter((inst: any) => inst && inst.id !== null);
          instructors.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        }
      } catch (err) {
        instructors = [];
      }

      const primaryInst = instructors[0] || null;

      return {
        id: r.id,
        title: r.title,
        type: r.type,
        difficulty: r.difficulty,
        topic: r.topic,
        description: r.description,
        fullDescription: r.fullDescription,
        instructorName: primaryInst ? primaryInst.name : r.instructorName,
        instructorTitle: primaryInst ? primaryInst.title : r.instructorTitle,
        duration: r.duration,
        lessonCount: r.lessonCount,
        rating: r.rating,
        enrolledCount: r.enrolledCount,
        partnerName: r.partnerName,
        skillsAcquired: JSON.parse(r.skillsAcquired || "[]"),
        requirements: JSON.parse(r.requirements || "[]"),
        syllabus: JSON.parse(r.syllabus || "[]"),
        thumbnailBg: r.thumbnailBg,
        thumbnailIconCode: r.thumbnailIconCode,
        isPaid: r.isPaid === 1,
        price: r.price,
        isLocked: r.is_locked === 1,
        instructors: instructors.map(i => ({ id: i.id, name: i.name, title: i.title, avatar: i.avatar })),
        instructor: primaryInst ? {
          name: primaryInst.name,
          title: primaryInst.title,
          avatar: primaryInst.avatar
        } : null
      };
    });
    return res.json({ success: true, courses });
  } catch (err: any) {
    console.error("[GET ADMIN COURSES ERR]", err);
    return res.status(500).json({ error: "Failed to retrieve admin courses: " + err.message });
  }
}

// Update an existing course
export function updateCourse(req: Request, res: Response) {
  const { id } = req.params;
  const {
    title,
    type,
    difficulty,
    topic,
    description,
    fullDescription,
    instructorName,
    instructorTitle,
    duration,
    lessonCount,
    partnerName,
    skillsAcquired,
    requirements,
    syllabus,
    thumbnailBg,
    thumbnailIconCode,
    isPaid,
    price,
    instructor_ids
  } = req.body;

  try {
    const existing = db.prepare("SELECT 1 FROM courses WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }

    const resolvedInstructorIds = Array.isArray(instructor_ids)
      ? instructor_ids.filter((x): x is string | number => x !== null && x !== undefined && x !== "")
      : [];

    let finalInstructorName = (instructorName || "").trim();
    let finalInstructorTitle = (instructorTitle || "").trim();

    if (resolvedInstructorIds.length > 0) {
      const primaryProfile = db.prepare("SELECT full_name, academic_title FROM instructor_profiles WHERE id = ?").get(Number(resolvedInstructorIds[0])) as any;
      if (primaryProfile) {
        finalInstructorName = primaryProfile.full_name;
        finalInstructorTitle = primaryProfile.academic_title;
      }
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE courses SET
          title = ?,
          type = ?,
          difficulty = ?,
          topic = ?,
          description = ?,
          fullDescription = ?,
          instructorName = ?,
          instructorTitle = ?,
          duration = ?,
          lessonCount = ?,
          partnerName = ?,
          skillsAcquired = ?,
          requirements = ?,
          syllabus = ?,
          thumbnailBg = ?,
          thumbnailIconCode = ?,
          isPaid = ?,
          price = ?,
          instructor_profile_id = NULL
        WHERE id = ?
      `).run(
        title.trim(),
        type,
        difficulty,
        topic,
        description.trim(),
        fullDescription.trim(),
        finalInstructorName,
        finalInstructorTitle,
        duration,
        lessonCount,
        partnerName ? partnerName.trim() : null,
        JSON.stringify(skillsAcquired || []),
        JSON.stringify(requirements || []),
        JSON.stringify(syllabus || []),
        thumbnailBg,
        thumbnailIconCode,
        isPaid ? 1 : 0,
        price ? Number(price) : 0,
        id
      );

      db.prepare("DELETE FROM course_instructors WHERE course_id = ?").run(id);

      const insertCI = db.prepare(`
        INSERT INTO course_instructors (course_id, instructor_profile_id, display_order)
        VALUES (?, ?, ?)
      `);

      for (let i = 0; i < resolvedInstructorIds.length; i++) {
        insertCI.run(id, Number(resolvedInstructorIds[i]), i);
      }
    })();

    const updatedRow = db.prepare(`
      SELECT c.*,
             json_group_array(
               json_object(
                 'id', ip.id,
                 'name', ip.full_name,
                 'title', ip.academic_title,
                 'avatar', ip.avatar_url,
                 'display_order', ci.display_order
               )
             ) AS instructors_json
      FROM courses c
      LEFT JOIN course_instructors ci ON c.id = ci.course_id
      LEFT JOIN instructor_profiles ip ON ci.instructor_profile_id = ip.id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(id) as any;

    let instructors: any[] = [];
    try {
      const parsed = JSON.parse(updatedRow.instructors_json);
      if (Array.isArray(parsed)) {
        instructors = parsed.filter((inst: any) => inst && inst.id !== null);
        instructors.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      }
    } catch (err) {
      instructors = [];
    }

    const primaryInst = instructors[0] || null;

    const updatedCourse = {
      id: updatedRow.id,
      title: updatedRow.title,
      type: updatedRow.type,
      difficulty: updatedRow.difficulty,
      topic: updatedRow.topic,
      description: updatedRow.description,
      fullDescription: updatedRow.fullDescription,
      instructorName: primaryInst ? primaryInst.name : updatedRow.instructorName,
      instructorTitle: primaryInst ? primaryInst.title : updatedRow.instructorTitle,
      duration: updatedRow.duration,
      lessonCount: updatedRow.lessonCount,
      rating: updatedRow.rating,
      enrolledCount: updatedRow.enrolledCount,
      partnerName: updatedRow.partnerName,
      skillsAcquired: JSON.parse(updatedRow.skillsAcquired || "[]"),
      requirements: JSON.parse(updatedRow.requirements || "[]"),
      syllabus: JSON.parse(updatedRow.syllabus || "[]"),
      thumbnailBg: updatedRow.thumbnailBg,
      thumbnailIconCode: updatedRow.thumbnailIconCode,
      isPaid: updatedRow.isPaid === 1,
      price: updatedRow.price,
      isLocked: updatedRow.is_locked === 1,
      instructors: instructors.map(i => ({ id: i.id, name: i.name, title: i.title, avatar: i.avatar })),
      instructor: primaryInst ? {
        name: primaryInst.name,
        title: primaryInst.title,
        avatar: primaryInst.avatar
      } : null
    };

    return res.json({
      success: true,
      message: `Course "${title}" successfully updated.`,
      course: updatedCourse
    });
  } catch (err: any) {
    console.error("[UPDATE COURSE ERR]", err);
    return res.status(500).json({ error: "Failed to update course: " + err.message });
  }
}

// Toggle course locked status (Patch id/lock)
export function toggleCourseLock(req: Request, res: Response) {
  const { id } = req.params;
  const { isLocked } = req.body || {};

  try {
    const course = db.prepare("SELECT title, is_locked FROM courses WHERE id = ?").get(id) as any;
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    let targetLock: number;
    if (typeof isLocked === "boolean") {
      targetLock = isLocked ? 1 : 0;
    } else {
      // Toggle if no explicit boolean provided
      targetLock = course.is_locked === 1 ? 0 : 1;
    }

    db.prepare("UPDATE courses SET is_locked = ? WHERE id = ?").run(targetLock, id);

    return res.json({
      success: true,
      message: `Course "${course.title}" lock status updated.`,
      isLocked: targetLock === 1
    });
  } catch (err: any) {
    console.error("[TOGGLE LOCK ERR]", err);
    return res.status(500).json({ error: "Failed to update course lock state: " + err.message });
  }
}

// Create a new course and content from the frontend
export function createCourse(req: Request, res: Response) {
  const user = (req as any).user;
  const {
    title,
    type,
    difficulty,
    topic,
    description,
    fullDescription,
    instructorName,
    instructorTitle,
    duration,
    lessonCount,
    partnerName,
    skillsAcquired,
    requirements,
    syllabus,
    thumbnailBg,
    thumbnailIconCode,
    isPaid,
    price,
    instructor_ids
  } = req.body;

  if (!title || !description || !fullDescription) {
    return res.status(400).json({ error: "Missing required core course parameters (title, description, fullDescription)." });
  }

  try {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    
    // Check if distinct course ID is already taken
    let targetId = slug;
    const existing = db.prepare("SELECT id FROM courses WHERE id = ?").get(targetId);
    if (existing) {
      targetId = `${slug}-${Math.random().toString(36).substring(2, 5)}`;
    }

    const resolvedInstructorIds = Array.isArray(instructor_ids)
      ? instructor_ids.filter((x): x is string | number => x !== null && x !== undefined && x !== "")
      : [];

    let finalInstructorName = (instructorName || user?.name || "Academic Facilitator").trim();
    let finalInstructorTitle = (instructorTitle || "Mountech Certification Board Member").trim();

    if (resolvedInstructorIds.length > 0) {
      const primaryProfile = db.prepare("SELECT full_name, academic_title FROM instructor_profiles WHERE id = ?").get(Number(resolvedInstructorIds[0])) as any;
      if (primaryProfile) {
        finalInstructorName = primaryProfile.full_name;
        finalInstructorTitle = primaryProfile.academic_title;
      }
    }

    const courseRecord = {
      id: targetId,
      title: title.trim(),
      type: type || 'Short Course',
      difficulty: difficulty || 'Beginner',
      topic: topic || 'AI Essentials',
      description: description.trim(),
      fullDescription: fullDescription.trim(),
      instructorName: finalInstructorName,
      instructorTitle: finalInstructorTitle,
      duration: duration || "2 hours",
      lessonCount: lessonCount || "5 lessons",
      rating: 4.8,
      enrolledCount: "10+ students",
      partnerName: partnerName ? partnerName.trim() : "Mountech Academy",
      skillsAcquired: Array.isArray(skillsAcquired) ? skillsAcquired : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      syllabus: Array.isArray(syllabus) ? syllabus : [],
      thumbnailBg: thumbnailBg || "bg-slate-900 text-slate-100",
      thumbnailIconCode: thumbnailIconCode || "default",
      isPaid: isPaid ? 1 : 0,
      price: price ? Number(price) : 0
    };

    db.transaction(() => {
      db.prepare(`
        INSERT INTO courses (
          id, title, type, difficulty, topic, description, fullDescription,
          instructorName, instructorTitle, duration, lessonCount, rating, enrolledCount,
          partnerName, skillsAcquired, requirements, syllabus, thumbnailBg, thumbnailIconCode, isPaid, price, instructor_profile_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `).run(
        courseRecord.id,
        courseRecord.title,
        courseRecord.type,
        courseRecord.difficulty,
        courseRecord.topic,
        courseRecord.description,
        courseRecord.fullDescription,
        courseRecord.instructorName,
        courseRecord.instructorTitle,
        courseRecord.duration,
        courseRecord.lessonCount,
        courseRecord.rating,
        courseRecord.enrolledCount,
        courseRecord.partnerName,
        JSON.stringify(courseRecord.skillsAcquired),
        JSON.stringify(courseRecord.requirements),
        JSON.stringify(courseRecord.syllabus),
        courseRecord.thumbnailBg,
        courseRecord.thumbnailIconCode,
        courseRecord.isPaid,
        courseRecord.price
      );

      const insertCI = db.prepare(`
        INSERT INTO course_instructors (course_id, instructor_profile_id, display_order)
        VALUES (?, ?, ?)
      `);

      for (let i = 0; i < resolvedInstructorIds.length; i++) {
        insertCI.run(courseRecord.id, Number(resolvedInstructorIds[i]), i);
      }
    })();

    console.log(`[COURSE CREATED] Course "${courseRecord.title}" successfully persisted in SQLite with ID: ${courseRecord.id}`);

    const createdRow = db.prepare(`
      SELECT c.*,
             json_group_array(
               json_object(
                 'id', ip.id,
                 'name', ip.full_name,
                 'title', ip.academic_title,
                 'avatar', ip.avatar_url,
                 'display_order', ci.display_order
               )
             ) AS instructors_json
      FROM courses c
      LEFT JOIN course_instructors ci ON c.id = ci.course_id
      LEFT JOIN instructor_profiles ip ON ci.instructor_profile_id = ip.id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(courseRecord.id) as any;

    let instructors: any[] = [];
    try {
      const parsed = JSON.parse(createdRow.instructors_json);
      if (Array.isArray(parsed)) {
        instructors = parsed.filter((inst: any) => inst && inst.id !== null);
        instructors.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      }
    } catch (err) {
      instructors = [];
    }

    const primaryInst = instructors[0] || null;

    const returnedCourse = {
      id: createdRow.id,
      title: createdRow.title,
      type: createdRow.type,
      difficulty: createdRow.difficulty,
      topic: createdRow.topic,
      description: createdRow.description,
      fullDescription: createdRow.fullDescription,
      instructorName: primaryInst ? primaryInst.name : createdRow.instructorName,
      instructorTitle: primaryInst ? primaryInst.title : createdRow.instructorTitle,
      duration: createdRow.duration,
      lessonCount: createdRow.lessonCount,
      rating: createdRow.rating,
      enrolledCount: createdRow.enrolledCount,
      partnerName: createdRow.partnerName,
      skillsAcquired: JSON.parse(createdRow.skillsAcquired || "[]"),
      requirements: JSON.parse(createdRow.requirements || "[]"),
      syllabus: JSON.parse(createdRow.syllabus || "[]"),
      thumbnailBg: createdRow.thumbnailBg,
      thumbnailIconCode: createdRow.thumbnailIconCode,
      isPaid: createdRow.isPaid === 1,
      price: createdRow.price,
      isLocked: createdRow.is_locked === 1,
      instructors: instructors.map(i => ({ id: i.id, name: i.name, title: i.title, avatar: i.avatar })),
      instructor: primaryInst ? {
        name: primaryInst.name,
        title: primaryInst.title,
        avatar: primaryInst.avatar
      } : null
    };

    return res.status(201).json({
      success: true,
      message: `Course "${courseRecord.title}" successfully initialized and created.`,
      course: returnedCourse
    });
  } catch (err: any) {
    console.error("[CREATE COURSE DB ERR]", err);
    return res.status(500).json({ error: "Failed to persist new course: " + err.message });
  }
}

// Phase 2: Live Session Controllers
export function createLiveSession(req: Request, res: Response) {
  const { courseId } = req.params;
  const { title, start_time, end_time, meet_url } = req.body;

  try {
    const course = db.prepare("SELECT title FROM courses WHERE id = ?").get(courseId) as { title: string } | undefined;
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const result = db.prepare(`
      INSERT INTO live_sessions (course_id, title, start_time, end_time, meet_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(courseId, title.trim(), start_time, end_time, meet_url.trim());

    return res.status(201).json({
      success: true,
      message: `Live class scheduled for "${course.title}" successfully.`,
      session: {
        id: result.lastInsertRowid,
        course_id: courseId,
        title: title.trim(),
        start_time,
        end_time
      }
    });
  } catch (err: any) {
    console.error("[CREATE LIVE SESSION ERR]", err);
    return res.status(500).json({ error: "Failed to schedule live class: " + err.message });
  }
}

export function listLiveSessions(req: Request, res: Response) {
  const { courseId } = req.params;

  try {
    const sessions = db.prepare(`
      SELECT id, course_id, title, start_time, end_time FROM live_sessions
      WHERE course_id = ?
      ORDER BY datetime(start_time) ASC
    `).all(courseId) as any[];

    return res.json({
      success: true,
      sessions
    });
  } catch (err: any) {
    console.error("[GET LIVE SESSIONS ERR]", err);
    return res.status(500).json({ error: "Failed to retrieve live sessions: " + err.message });
  }
}

export function joinLiveSession(req: Request, res: Response) {
  const user = (req as any).user;
  const { sessionId } = req.params;
  const normalizedEmail = user.email.trim().toLowerCase();

  try {
    const session = db.prepare("SELECT * FROM live_sessions WHERE id = ?").get(sessionId) as any;
    if (!session) {
      return res.status(404).json({ error: "Scheduled live session not found." });
    }

    if (user.role !== "admin" && user.role !== "developer") {
      const isEnrolled = db.prepare(`
        SELECT 1 FROM enrollments WHERE email = ? AND courseId = ?
      `).get(normalizedEmail, session.course_id);

      if (!isEnrolled) {
        return res.status(403).json({ error: "Access Denied: You must be registered in this course to join the live session." });
      }
    }

    const startEpoch = new Date(session.start_time).getTime();
    const endEpoch = new Date(session.end_time).getTime();
    const currentEpoch = Date.now();
    const joinWindowStart = startEpoch - (5 * 60 * 1000); // 5 minutes cushion

    if (currentEpoch < joinWindowStart) {
      const minsDiff = Math.ceil((joinWindowStart - currentEpoch) / 60000);
      return res.status(403).json({
        error: `Meeting is locked. The classroom opens exactly 5 minutes before start: ready in ${minsDiff} minutes.`,
        readyInMs: joinWindowStart - currentEpoch
      });
    }

    if (currentEpoch > endEpoch) {
      return res.status(403).json({ error: "Forbidden: This scheduled live classroom session has already ended." });
    }

    if (req.headers.accept?.includes("text/html") || req.query.redirect === "true") {
      return res.redirect(session.meet_url);
    }

    return res.json({
      success: true,
      meetUrl: session.meet_url
    });
  } catch (err: any) {
    console.error("[JOIN LIVE SESSION GATEKEEPER ERR]", err);
    return res.status(500).json({ error: "Gatekeeper check failed: " + err.message });
  }
}

