import { Router } from "express";
import { CreateInstructorProfileSchema, UpdateInstructorProfileSchema } from "../schemas/instructor.js";
import { validateRequest } from "../middlewares/validate.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import {
  listInstructors,
  getInstructorByEmail,
  createInstructorProfile,
  updateInstructorProfile,
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

export default router;
