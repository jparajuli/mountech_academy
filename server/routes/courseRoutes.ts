import { Router } from "express";
import { EnrollSchema, CompleteSchema, RatingSchema } from "../schemas/course.js";
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
} from "../controllers/courseController.js";

const router = Router();

router.get("/courses", listCourses);
router.post("/courses", requireAuth, requireRole(["admin", "developer"]), createCourse);
router.get("/download/syllabus", getSyllabus);
router.get("/enrollments", requireAuth, getEnrollments);
router.post("/enroll", requireAuth, validateRequest(EnrollSchema), enroll);
router.post("/complete", requireAuth, validateRequest(CompleteSchema), complete);
router.get("/certificate/download", certificateDownload);
router.get("/ratings/:courseId", getRatings);
router.post("/ratings", requireAuth, validateRequest(RatingSchema), submitRating);

export default router;
