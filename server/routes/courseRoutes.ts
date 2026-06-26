import { Router } from "express";
import { EnrollSchema, CompleteSchema, RatingSchema, AdminCourseSchema, LiveSessionSchema } from "../schemas/course.js";
import { UpdateSyllabusSchema } from "../schemas/instructor.js";
import { validateRequest } from "../middlewares/validate.js";
import { requireAuth, requireRole, requireSyllabusEditAuth, checkCourseSunset } from "../middlewares/auth.js";
import multer from "multer";
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
  getCourseLessonsForStudent,
  getLessonProblems,
  getLessonDetail,
  updateLessonConfig,
  getJaasToken,
  getLessonDocumentPreSignedUrl,
  uploadLessonMedia,
  getLessonVideoToken,
} from "../controllers/courseController.js";
import { createManualCheckout } from "../controllers/paymentController.js";
import { handleGitLabWebhook } from "../../src/controllers/gitlabController.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max limit
  }
});

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
router.post("/checkout/manual", requireAuth, createManualCheckout);
router.post("/complete", requireAuth, validateRequest(CompleteSchema), complete);
router.get("/certificate/download", certificateDownload);
router.get("/courses/:courseId/certificate", certificateDownload);
router.get("/ratings/:courseId", getRatings);
router.post("/ratings", requireAuth, validateRequest(RatingSchema), submitRating);

// Live Sessions Phase 2 routes
router.post("/admin/courses/:courseId/sessions", requireAuth, requireRole(["admin"]), validateRequest(LiveSessionSchema), createLiveSession);
router.get("/courses/:courseId/sessions", requireAuth, checkCourseSunset, listLiveSessions);
router.get("/sessions/:sessionId/join", requireAuth, checkCourseSunset, joinLiveSession);
router.get("/live-sessions/:lessonId/jaas-token", requireAuth, getJaasToken);

// Student Exams Phase 3 routes
router.get("/courses/:courseId/student-exams", requireAuth, checkCourseSunset, getCourseExamsForStudent);
router.post("/courses/:courseId/exams/:examId/start", requireAuth, checkCourseSunset, startStudentExam);
router.post("/attempts/:attemptId/submit", requireAuth, checkCourseSunset, submitStudentExamResponse);
router.get("/courses/:courseId/lessons", requireAuth, checkCourseSunset, getCourseLessonsForStudent);
router.get("/lessons/:lessonId/problems", requireAuth, checkCourseSunset, getLessonProblems);
router.get("/lessons/:lessonId", requireAuth, checkCourseSunset, getLessonDetail);
router.patch("/admin/lessons/:lessonId/config", requireAuth, requireRole(["admin", "instructor"]), updateLessonConfig);

// Phase 5: R2 & Mux VOD Media Delivery routes
router.get("/lessons/:lessonId/document", requireAuth, checkCourseSunset, getLessonDocumentPreSignedUrl);
router.post(
  "/lessons/:lessonId/media",
  requireAuth,
  requireRole(["admin", "instructor"]),
  upload.fields([
    { name: "document", maxCount: 1 },
    { name: "video", maxCount: 1 }
  ]),
  uploadLessonMedia
);
router.get("/lessons/:lessonId/video-token", requireAuth, checkCourseSunset, getLessonVideoToken);

// GitLab Webhook Integration Phase 4 route
router.post("/gitlab/webhook", handleGitLabWebhook);

export default router;
