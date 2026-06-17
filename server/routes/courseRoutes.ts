import { Router } from "express";
import { EnrollSchema, CompleteSchema, RatingSchema, AdminCourseSchema, LiveSessionSchema } from "../schemas/course.js";
import { validateRequest } from "../middlewares/validate.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import {
  getSyllabus,
  getEnrollments,
  enroll,
  complete,
  certificateDownload,
  getRatings,
  submitRating,
  listCourses,
  createCourse,
  listAdminCourses,
  updateCourse,
  toggleCourseLock,
  createLiveSession,
  listLiveSessions,
  joinLiveSession,
  getCourseExamsForStudent,
  startStudentExam,
  submitStudentExamResponse,
} from "../controllers/courseController.js";

const router = Router();

router.get("/courses", listCourses);
router.get("/admin/courses", requireAuth, requireRole(["admin", "developer"]), listAdminCourses);
router.post("/courses", requireAuth, requireRole(["admin", "developer"]), createCourse);
router.put("/admin/courses/:id", requireAuth, requireRole(["admin", "developer"]), validateRequest(AdminCourseSchema), updateCourse);
router.patch("/admin/courses/:id/lock", requireAuth, requireRole(["admin", "developer"]), toggleCourseLock);
router.get("/download/syllabus", getSyllabus);
router.get("/enrollments", requireAuth, getEnrollments);
router.post("/enroll", requireAuth, validateRequest(EnrollSchema), enroll);
router.post("/complete", requireAuth, validateRequest(CompleteSchema), complete);
router.get("/certificate/download", certificateDownload);
router.get("/ratings/:courseId", getRatings);
router.post("/ratings", requireAuth, validateRequest(RatingSchema), submitRating);

// Live Sessions Phase 2 routes
router.post("/admin/courses/:courseId/sessions", requireAuth, requireRole(["admin", "developer"]), validateRequest(LiveSessionSchema), createLiveSession);
router.get("/courses/:courseId/sessions", listLiveSessions);
router.get("/sessions/:sessionId/join", requireAuth, joinLiveSession);

// Student Exams Phase 3 routes
router.get("/courses/:courseId/student-exams", requireAuth, getCourseExamsForStudent);
router.post("/courses/:courseId/exams/:examId/start", requireAuth, startStudentExam);
router.post("/attempts/:attemptId/submit", requireAuth, submitStudentExamResponse);

export default router;
