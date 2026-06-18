import { Router } from "express";
import { EnrollSchema, CompleteSchema, RatingSchema, AdminCourseSchema, LiveSessionSchema } from "../schemas/course.js";
import { UpdateSyllabusSchema } from "../schemas/instructor.js";
import { validateRequest } from "../middlewares/validate.js";
import { requireAuth, requireRole, requireSyllabusEditAuth } from "../middlewares/auth.js";
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
  updateSharedSyllabus,
} from "../controllers/courseController.js";
import { handleGitLabWebhook } from "../../src/controllers/gitlabController.js";

const router = Router();

router.get("/courses", listCourses);
router.get("/admin/courses", requireAuth, requireRole(["admin"]), listAdminCourses);
router.post("/courses", requireAuth, requireRole(["admin"]), createCourse);
router.put("/admin/courses/:id", requireAuth, requireRole(["admin"]), validateRequest(AdminCourseSchema), updateCourse);
router.patch("/admin/courses/:id/lock", requireAuth, requireRole(["admin"]), toggleCourseLock);
router.get("/download/syllabus", getSyllabus);
router.put("/courses/:courseId/syllabus", requireAuth, requireSyllabusEditAuth, validateRequest(UpdateSyllabusSchema), updateSharedSyllabus);
router.get("/enrollments", requireAuth, getEnrollments);
router.post("/enroll", requireAuth, validateRequest(EnrollSchema), enroll);
router.post("/complete", requireAuth, validateRequest(CompleteSchema), complete);
router.get("/certificate/download", certificateDownload);
router.get("/courses/:courseId/certificate", certificateDownload);
router.get("/ratings/:courseId", getRatings);
router.post("/ratings", requireAuth, validateRequest(RatingSchema), submitRating);

// Live Sessions Phase 2 routes
router.post("/admin/courses/:courseId/sessions", requireAuth, requireRole(["admin"]), validateRequest(LiveSessionSchema), createLiveSession);
router.get("/courses/:courseId/sessions", listLiveSessions);
router.get("/sessions/:sessionId/join", requireAuth, joinLiveSession);

// Student Exams Phase 3 routes
router.get("/courses/:courseId/student-exams", requireAuth, getCourseExamsForStudent);
router.post("/courses/:courseId/exams/:examId/start", requireAuth, startStudentExam);
router.post("/attempts/:attemptId/submit", requireAuth, submitStudentExamResponse);

// GitLab Webhook Integration Phase 4 route
router.post("/gitlab/webhook", handleGitLabWebhook);

export default router;
