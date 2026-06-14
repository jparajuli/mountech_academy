import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { getDeveloperLogs } from "../controllers/developerController.js";

const router = Router();

router.get("/logs", requireAuth, requireRole(["developer"]), getDeveloperLogs);

export default router;
