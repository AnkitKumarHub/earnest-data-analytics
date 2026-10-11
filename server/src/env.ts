import "dotenv/config";
import { z } from "zod";

const rawEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
  DATABASE_URL: z.string().url().refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), "DATABASE_URL must be a PostgreSQL URL."),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  ACCESS_TOKEN_SECRET: z.string().min(32, "ACCESS_TOKEN_SECRET must contain at least 32 characters"),
  REFRESH_TOKEN_SECRET: z.string().min(32, "REFRESH_TOKEN_SECRET must contain at least 32 characters"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(30 * 60),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
});

const parsedEnvironment = rawEnvironmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  const details = parsedEnvironment.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid server environment:\n${details}`);
}

const raw = parsedEnvironment.data;
const cookieSameSite = raw.COOKIE_SAME_SITE ?? (raw.NODE_ENV === "production" ? "none" : "lax");
const cookieSecure = raw.COOKIE_SECURE === undefined
  ? raw.NODE_ENV === "production"
  : raw.COOKIE_SECURE === "true";

if (cookieSameSite === "none" && !cookieSecure) {
  throw new Error("COOKIE_SAME_SITE=none requires COOKIE_SECURE=true.");
}

if (raw.ACCESS_TOKEN_SECRET === raw.REFRESH_TOKEN_SECRET) {
  throw new Error("ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different values.");
}

export const env = {
  nodeEnv: raw.NODE_ENV,
  port: raw.PORT,
  databaseUrl: raw.DATABASE_URL,
  frontendOrigin: new URL(raw.FRONTEND_ORIGIN).origin,
  accessTokenSecret: raw.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: raw.REFRESH_TOKEN_SECRET,
  accessTokenTtlSeconds: raw.ACCESS_TOKEN_TTL_SECONDS,
  refreshTokenTtlSeconds: raw.REFRESH_TOKEN_TTL_SECONDS,
  cookieSameSite,
  cookieSecure,
} as const;
