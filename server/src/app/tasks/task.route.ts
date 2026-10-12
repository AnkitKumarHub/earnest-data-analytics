import { Router, type Router as ExpressRouter } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { create, get, list, remove, update } from "./task.controller.js";

const router: ExpressRouter = Router();
router.use(requireAuth);
router.get("/", list);
router.post("/", create);
router.get("/:id", get);
router.patch("/:id", update);
router.delete("/:id", remove);

export default router;
