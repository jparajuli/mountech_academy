import { Router } from "express";
import { EnrollSchema, CompleteSchema, RatingSchema } from "../schemas/course.js";
import { validateRequest } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  getSyllabus,
  getEnrollments,
  enroll,
  complete,
  certificateDownload,
  getRatings,
  submitRating,
} from "../controllers/courseController.js";

const router = Router();

router.get("/download/syllabus", getSyllabus);
router.get("/enrollments", requireAuth, getEnrollments);
router.post("/enroll", requireAuth, validateRequest(EnrollSchema), enroll);
router.post("/complete", requireAuth, validateRequest(CompleteSchema), complete);
router.get("/certificate/download", certificateDownload);
router.get("/ratings/:courseId", getRatings);
router.post("/ratings", requireAuth, validateRequest(RatingSchema), submitRating);

export default router;
