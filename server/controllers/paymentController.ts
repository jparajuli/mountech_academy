import { Request, Response } from "express";
import db from "../db/database.js";

function generateReferenceCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Student: Request manual bank transfer
export async function createManualCheckout(req: Request, res: Response) {
  const user = (req as any).user;
  const { courseId, courseTitle } = req.body;
  
  if (!courseId || !courseTitle) {
    return res.status(400).json({ error: "Missing courseId or courseTitle." });
  }

  const normalizedEmail = user.email.trim().toLowerCase();

  try {
    // Check if there is already an enrollment
    const existing = db.prepare(`
      SELECT * FROM enrollments WHERE email = ? AND courseId = ?
    `).get(normalizedEmail, courseId) as any;

    if (existing) {
      if (existing.payment_status === 'completed') {
        return res.status(400).json({ error: "You are already enrolled in this course." });
      }
      // If it is already pending, return the existing reference
      if (existing.payment_status === 'pending') {
        return res.json({
          success: true,
          payment_reference: existing.payment_reference,
          bankDetails: {
            iban: "NP0398700100200003456",
            swift: "MOUNTNPKAXX",
            accountName: "Mountech Academy Pvt. Ltd.",
            bankName: "Global IME Bank Nepal",
            routingNumber: "0100200",
            amount: existing.price || 49
          }
        });
      }
    }

    const referenceCode = generateReferenceCode();
    
    // Get price from course
    const course = db.prepare("SELECT price FROM courses WHERE id = ?").get(courseId) as any;
    const price = course ? course.price : 49;

    // Create the enrollment as pending
    const insertStmt = db.prepare(`
      INSERT INTO enrollments (email, name, courseId, courseTitle, status, timestamp, payment_method, payment_status, payment_reference)
      VALUES (?, ?, ?, ?, 'Enrolled', ?, 'manual_bank', 'pending', ?)
    `);
    
    insertStmt.run(
      normalizedEmail, 
      user.name, 
      courseId, 
      courseTitle, 
      new Date().toISOString(), 
      referenceCode
    );

    return res.json({
      success: true,
      payment_reference: referenceCode,
      bankDetails: {
        iban: "NP0398700100200003456",
        swift: "MOUNTNPKAXX",
        accountName: "Mountech Academy Pvt. Ltd.",
        bankName: "Global IME Bank Nepal",
        routingNumber: "0100200",
        amount: price
      }
    });
  } catch (error: any) {
    console.error("[MANUAL CHECKOUT ERROR]", error);
    return res.status(500).json({ error: "Failed to create manual bank transfer: " + error.message });
  }
}

// Admin: Get all pending payments with user and course join-data
export async function getPendingPayments(req: Request, res: Response) {
  try {
    const pending = db.prepare(`
      SELECT 
        e.id, 
        e.email, 
        e.name, 
        e.courseId, 
        e.courseTitle, 
        e.timestamp, 
        e.payment_method, 
        e.payment_status, 
        e.payment_reference,
        c.price
      FROM enrollments e
      LEFT JOIN courses c ON e.courseId = c.id
      WHERE e.payment_status = 'pending'
      ORDER BY e.timestamp DESC
    `).all() as any[];

    return res.json({ success: true, payments: pending });
  } catch (error: any) {
    console.error("[PENDING PAYMENTS ERROR]", error);
    return res.status(500).json({ error: "Failed to load pending manual bank transfers: " + error.message });
  }
}

// Admin: Approve a manual payment to unlock student access
export async function approvePayment(req: Request, res: Response) {
  const { enrollmentId } = req.params;

  try {
    const enrollment = db.prepare(`
      SELECT * FROM enrollments WHERE id = ?
    `).get(enrollmentId) as any;

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment record not found." });
    }

    if (enrollment.payment_status === 'completed') {
      return res.status(400).json({ error: "This enrollment payment has already been approved." });
    }

    // Update payment_status to 'completed'
    db.prepare(`
      UPDATE enrollments
      SET payment_status = 'completed'
      WHERE id = ?
    `).run(enrollmentId);

    return res.json({
      success: true,
      message: `Successfully approved payment and unlocked course enrollment for ${enrollment.email}.`
    });
  } catch (error: any) {
    console.error("[APPROVE PAYMENT ERROR]", error);
    return res.status(500).json({ error: "Failed to approve payment: " + error.message });
  }
}
