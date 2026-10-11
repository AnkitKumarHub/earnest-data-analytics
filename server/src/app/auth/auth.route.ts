import { Router, type Router as ExpressRouter } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../env.js";
import { login, logout, me, refresh, register } from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";

const router: ExpressRouter = Router();
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.nodeEnv === "test",
});

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);
router.post("/refresh", authRateLimit, refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
