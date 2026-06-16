import { Router } from "express";
import {
  CreateInstructorProfileSchema,
  UpdateInstructorProfileSchema,
  UpdateSyllabusSchema,
  CreateExamSchema,
  CreateQuestionSchema,
} from "../schemas/instructor.js";
import { validateRequest } from "../middlewares/validate.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import {
  listInstructors,
  getInstructorByEmail,
  createInstructorProfile,
  updateInstructorProfile,
  getInstructorDashboard,
  getCourseStudents,
  getCourseMaterials,
  createCourseMaterial,
  updateCourseSyllabus,
  createCourseExam,
  listCourseExams,
  createExamQuestion,
  updateExamQuestion,
  deleteCourseExam,
  deleteExamQuestion,
} from "../controllers/instructorController.js";

const router = Router();

// Public route to view loaded faculty
router.get("/instructors", listInstructors);

// Helper route to check profile detail by email (for dashboard mapping)
router.get("/instructors/email/:email", requireAuth, getInstructorByEmail);

// Admin-only creation endpoint
router.post(
  "/admin/instructors",
  requireAuth,
  requireRole(["admin", "developer"]),
  validateRequest(CreateInstructorProfileSchema),
  createInstructorProfile
);

// Secure edit route (Middleware requireAuth, checks custom auth in controller)
router.put(
  "/instructors/:id",
  requireAuth,
  validateRequest(UpdateInstructorProfileSchema),
  updateInstructorProfile
);

// --- NEW INSTRUCTOR PORTAL GATEWAYS ---
// Instructor Dashboard
router.get(
  "/instructor/dashboard",
  requireAuth,
  requireRole(["instructor"]),
  getInstructorDashboard
);

// Students roster for instructor course
router.get(
  "/instructor/courses/:courseId/students",
  requireAuth,
  requireRole(["instructor"]),
  getCourseStudents
);

// Retrieve Materials for instructor course
router.get(
  "/instructor/courses/:courseId/materials",
  requireAuth,
  requireRole(["instructor"]),
  getCourseMaterials
);

// Creation endpoint for course materials
router.post(
  "/instructor/courses/:courseId/materials",
  requireAuth,
  requireRole(["instructor"]),
  createCourseMaterial
);

// --- NEW SYLLABUS AND EXAMS ROUTE SETS ---

// Update Course Syllabus
router.put(
  "/instructor/courses/:courseId/syllabus",
  requireAuth,
  requireRole(["instructor"]),
  validateRequest(UpdateSyllabusSchema),
  updateCourseSyllabus
);

// List Course Exams
router.get(
  "/instructor/courses/:courseId/exams",
  requireAuth,
  requireRole(["instructor"]),
  listCourseExams
);

// Create Course Exam
router.post(
  "/instructor/courses/:courseId/exams",
  requireAuth,
  requireRole(["instructor"]),
  validateRequest(CreateExamSchema),
  createCourseExam
);

// Delete Exam
router.delete(
  "/instructor/exams/:examId",
  requireAuth,
  requireRole(["instructor"]),
  deleteCourseExam
);

// Add Exam Question
router.post(
  "/instructor/exams/:examId/questions",
  requireAuth,
  requireRole(["instructor"]),
  validateRequest(CreateQuestionSchema),
  createExamQuestion
);

// Edit Exam Question
router.put(
  "/instructor/exams/:examId/questions/:questionId",
  requireAuth,
  requireRole(["instructor"]),
  validateRequest(CreateQuestionSchema),
  updateExamQuestion
);

// Delete Exam Question
router.delete(
  "/instructor/exams/:examId/questions/:questionId",
  requireAuth,
  requireRole(["instructor"]),
  deleteExamQuestion
);

export default router;
