import "dotenv/config";
import { afterAll, afterEach, beforeAll } from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL must point to a disposable PostgreSQL database before running tests.");
}

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testDatabaseUrl;
process.env.COOKIE_SAME_SITE ??= "lax";
process.env.COOKIE_SECURE ??= "false";
process.env.FRONTEND_ORIGIN ??= "http://localhost:5173";
process.env.ACCESS_TOKEN_SECRET ??= "test-access-secret-change-this-32-characters-minimum";
process.env.REFRESH_TOKEN_SECRET ??= "test-refresh-secret-change-this-32-characters-minimum";

const [{ db, closeDatabase }, { migrate }] = await Promise.all([
  import("../db/index.js"),
  import("drizzle-orm/postgres-js/migrator"),
]);
const { usersTable, tasksTable, refreshSessionsTable } = await import("../db/schema.js");

async function clearTestData(): Promise<void> {
  await db.delete(refreshSessionsTable);
  await db.delete(tasksTable);
  await db.delete(usersTable);
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await clearTestData();
});

afterEach(clearTestData);

afterAll(async () => {
  await closeDatabase();
});
