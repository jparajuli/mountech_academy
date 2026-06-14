import { Router } from "express";
import { RegisterSchema, LoginSchema, ResendVerificationSchema } from "../schemas/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import { requireAuth } from "../middlewares/auth.js";
import { oauth, register, resend, verify, login, me, logins } from "../controllers/authController.js";

const router = Router();

router.post("/oauth", oauth);
router.post("/register", validateRequest(RegisterSchema), register);
router.post("/resend", validateRequest(ResendVerificationSchema), resend);
router.get("/verify", verify);
router.post("/login", validateRequest(LoginSchema), login);
router.get("/me", requireAuth, me);
router.get("/logins", requireAuth, logins);

export default router;
