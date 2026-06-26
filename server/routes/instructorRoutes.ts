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
import { requireCourseOwnership, forbidStudentUpload } from "../middlewares/rbac.js";
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
  updateCourseExam,
  listCourseExams,
  createExamQuestion,
  updateExamQuestion,
  deleteCourseExam,
  deleteExamQuestion,
  saveCustomSlides,
  getCustomSlides,
  getSlideRevisions,
  generateSlidesAI,
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
  requireRole(["admin"]),
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
  requireRole(["instructor", "admin"]),
  getInstructorDashboard
);

// Students roster for instructor course
router.get(
  "/instructor/courses/:courseId/students",
  requireAuth,
  requireRole(["instructor", "admin"]),
  requireCourseOwnership,
  getCourseStudents
);

// Retrieve Materials for instructor course
router.get(
  "/instructor/courses/:courseId/materials",
  requireAuth,
  requireRole(["instructor", "admin"]),
  requireCourseOwnership,
  getCourseMaterials
);

// Creation endpoint for course materials
router.post(
  "/instructor/courses/:courseId/materials",
  requireAuth,
  forbidStudentUpload,
  requireRole(["instructor", "admin"]),
  requireCourseOwnership,
  createCourseMaterial
);

// --- NEW SYLLABUS AND EXAMS ROUTE SETS ---

// Update Course Syllabus
router.put(
  "/instructor/courses/:courseId/syllabus",
  requireAuth,
  requireRole(["instructor", "admin"]),
  requireCourseOwnership,
  validateRequest(UpdateSyllabusSchema),
  updateCourseSyllabus
);

// List Course Exams
router.get(
  "/instructor/courses/:courseId/exams",
  requireAuth,
  requireRole(["instructor", "admin"]),
  requireCourseOwnership,
  listCourseExams
);

// Create Course Exam
router.post(
  "/instructor/courses/:courseId/exams",
  requireAuth,
  requireRole(["instructor", "admin"]),
  requireCourseOwnership,
  validateRequest(CreateExamSchema),
  createCourseExam
);

// Update Course Exam
router.put(
  "/instructor/exams/:examId",
  requireAuth,
  requireRole(["instructor", "admin"]),
  requireCourseOwnership,
  validateRequest(CreateExamSchema),
  updateCourseExam
);

// Delete Exam
router.delete(
  "/instructor/exams/:examId",
  requireAuth,
  requireRole(["instructor", "admin"]),
  requireCourseOwnership,
  deleteCourseExam
);

// Add Exam Question
router.post(
  "/instructor/exams/:examId/questions",
  requireAuth,
  requireRole(["instructor", "admin"]),
  requireCourseOwnership,
  validateRequest(CreateQuestionSchema),
  createExamQuestion
);

// Edit Exam Question
router.put(
  "/instructor/exams/:examId/questions/:questionId",
  requireAuth,
  requireRole(["instructor", "admin"]),
  requireCourseOwnership,
  validateRequest(CreateQuestionSchema),
  updateExamQuestion
);

// Delete Exam Question
router.delete(
  "/instructor/exams/:examId/questions/:questionId",
  requireAuth,
  requireRole(["instructor", "admin"]),
  requireCourseOwnership,
  deleteExamQuestion
);

// --- ENTERPRISE SLIDE STUDIO PORTAL ENDPOINTS ---

// Retrieve slides for classroom (accessible to any authenticated student or staff)
router.get(
  "/lessons/:lessonId/slides",
  requireAuth,
  getCustomSlides
);

// Retrieve slide revisions history (accessible to instructors and admins)
router.get(
  "/lessons/:lessonId/slides/revisions",
  requireAuth,
  requireRole(["instructor", "admin"]),
  getSlideRevisions
);

// Save/publish custom instructor slides
router.post(
  "/lessons/:lessonId/slides",
  requireAuth,
  requireRole(["instructor", "admin"]),
  saveCustomSlides
);

// Auto-generate slides with Gemini AI Scribe
router.post(
  "/ai/generate-slides",
  requireAuth,
  requireRole(["instructor", "admin"]),
  generateSlidesAI
);

export default router;
