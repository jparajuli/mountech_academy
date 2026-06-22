import { Router } from "express";
import { UpdateRoleSchema } from "../schemas/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { getUsers, getEnrollments, updateRole, getAuditLogs } from "../controllers/adminController.js";
import { getPendingPayments, approvePayment } from "../controllers/paymentController.js";

const router = Router();

router.get("/users", requireAuth, requireRole(["admin"]), getUsers);
router.get("/enrollments", requireAuth, requireRole(["admin"]), getEnrollments);
router.get("/payments/pending", requireAuth, requireRole(["admin"]), getPendingPayments);
router.post("/payments/approve/:enrollmentId", requireAuth, requireRole(["admin"]), approvePayment);
router.get("/audit-logs", requireAuth, requireRole(["admin"]), getAuditLogs);
router.put("/users/role", requireAuth, requireRole(["admin"]), validateRequest(UpdateRoleSchema), updateRole);

export default router;
