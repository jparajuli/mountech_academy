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

// Admin: Aggregate Student Lifecycle & Exam Telemetry Overview
export const getStudentsOverview = catchAsync(async (req: Request, res: Response) => {
  // Fetch all users with student role or who have enrollment records
  const users = db.prepare(`
    SELECT email, name, role, createdAt 
    FROM users 
    WHERE role = 'student' OR email IN (SELECT DISTINCT email FROM enrollments)
    ORDER BY name ASC
  `).all() as any[];

  // Fetch all enrollments
  const enrollments = db.prepare(`
    SELECT id, email, courseId, courseTitle, status, timestamp, payment_method, payment_status, payment_reference, certificate_downloaded_at, course_completed_at
    FROM enrollments
  `).all() as any[];

  // Fetch all exam attempts with associated exam metadata
  const attempts = db.prepare(`
    SELECT ea.id, ea.exam_id, ea.user_id, ea.score, ea.passed, ea.started_at, ea.completed_at,
           e.title AS exam_title, e.exam_type, e.course_id
    FROM exam_attempts ea
    JOIN exams e ON ea.exam_id = e.id
    ORDER BY ea.started_at DESC
  `).all() as any[];

  const dossiers = users.map((user) => {
    const userEmailLower = user.email.trim().toLowerCase();
    
    // Enrollments for this student
    const studentEnrollments = enrollments.filter(
      (e) => e.email.trim().toLowerCase() === userEmailLower
    );

    // Exam attempts for this student
    const studentAttempts = attempts.filter(
      (a) => a.user_id.trim().toLowerCase() === userEmailLower
    );

    const mappedEnrollments = studentEnrollments.map((enr) => {
      // Exam attempts for this course
      const courseAttempts = studentAttempts.filter(
        (a) => a.course_id === enr.courseId
      );

      const totalCourseExams = courseAttempts.length;
      const scores = courseAttempts.map((a) => a.score).filter((s) => s !== null && s !== undefined);
      const avgCourseScore = scores.length > 0 
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) 
        : 0;

      // Final exam status check
      const finalAttempts = courseAttempts.filter(
        (a) => a.exam_type === 'final'
      );
      
      let finalExamStatus: 'Passed' | 'Failed' | 'Not Attempted' = 'Not Attempted';
      if (finalAttempts.length > 0) {
        const passedAny = finalAttempts.some((a) => a.passed === 1);
        finalExamStatus = passedAny ? 'Passed' : 'Failed';
      }

      // Derived status mapping
      let enrollmentStatus: 'Pending Verification' | 'Active' | 'Completed' | 'Certified' = 'Active';
      if (enr.payment_status && enr.payment_status !== 'completed') {
        enrollmentStatus = 'Pending Verification';
      } else if (enr.certificate_downloaded_at) {
        enrollmentStatus = 'Certified';
      } else if (enr.course_completed_at || finalExamStatus === 'Passed') {
        enrollmentStatus = 'Completed';
      }

      return {
        courseId: enr.courseId,
        courseTitle: enr.courseTitle,
        enrolledAt: enr.timestamp,
        paymentMethod: enr.payment_method || 'stripe',
        paymentStatus: enr.payment_status || 'completed',
        paymentReference: enr.payment_reference || null,
        certificateDownloadedAt: enr.certificate_downloaded_at || null,
        courseCompletedAt: enr.course_completed_at || (finalExamStatus === 'Passed' ? enr.timestamp : null),
        enrollmentStatus,
        totalExamsTaken: totalCourseExams,
        averageScore: avgCourseScore,
        finalExamStatus,
        attempts: courseAttempts.map(att => ({
          id: att.id,
          examId: att.exam_id,
          title: att.exam_title,
          type: att.exam_type || 'final',
          score: att.score || 0,
          passed: att.passed === 1,
          date: att.completed_at || att.started_at
        }))
      };
    });

    // Compute student aggregate level metrics
    const totalEnrollments = studentEnrollments.length;
    const totalExamsPassed = studentAttempts.filter((a) => a.passed === 1).length;
    const allScores = studentAttempts.map((a) => a.score).filter((s) => s !== null && s !== undefined);
    const averageScoreAll = allScores.length > 0 
      ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length) 
      : 0;

    const hasPendingPayment = mappedEnrollments.some(
      (e) => e.enrollmentStatus === 'Pending Verification'
    );

    let overallStatus: 'New Student' | 'Active Student' | 'High Achiever' | 'Graduate' = 'New Student';
    const hasCertified = mappedEnrollments.some((e) => e.enrollmentStatus === 'Certified');
    const hasCompleted = mappedEnrollments.some((e) => e.enrollmentStatus === 'Completed');
    
    if (hasCertified) {
      overallStatus = 'Graduate';
    } else if (averageScoreAll >= 85 && totalExamsPassed > 0) {
      overallStatus = 'High Achiever';
    } else if (hasCompleted || totalEnrollments > 0) {
      overallStatus = 'Active Student';
    }

    return {
      email: user.email,
      name: user.name,
      role: user.role,
      joinedDate: user.createdAt,
      enrollments: mappedEnrollments,
      overallStats: {
        totalEnrollments,
        totalExamsPassed,
        averageScoreAll,
        hasPendingPayment,
        overallStatus
      }
    };
  });

  return res.json({ dossiers });
});

