import { Router } from "express";
import { getDeveloperLogs } from "../controllers/developerController.js";

const router = Router();

router.get("/logs", getDeveloperLogs);

export default router;
