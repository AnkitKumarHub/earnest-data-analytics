import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "../env.js";

const client = postgres(env.databaseUrl, {
  prepare: false,
  max: env.nodeEnv === "test" ? 2 : 10,
});

export const db = drizzle({ client });
export const closeDatabase = () => client.end({ timeout: 5 });
