import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { env } from "../env.js";
import authRouter from "./auth/auth.route.js";
import { verifyRequestOrigin } from "./auth/auth.middleware.js";
import { errorHandler, notFoundHandler } from "./errors/error.middleware.js";
import taskRouter from "./tasks/task.route.js";

export function createServerApplication(): Application {
  const app = express();

  app.use(cors({ origin: env.frontendOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(verifyRequestOrigin);

  app.get("/health", async (_request, response) => {
    try {
      await db.execute(sql`select 1`);
      response.status(200).json({ data: { server: "ok", database: "ok" } });
    } catch {
      response.status(503).json({
        error: { code: "NOT_READY", message: "The service is temporarily unavailable." },
      });
    }
  });

  app.use(authRouter);
  app.use("/tasks", taskRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
