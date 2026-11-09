import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, logout, me, register } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Brute force se bachao: auth routes par alag, sakht limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Bahut zyada koshish. 15 minute baad try karein." },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
