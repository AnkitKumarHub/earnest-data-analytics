import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../../env.js";
import { db } from "../../db/index.js";
import { refreshSessionsTable, usersTable, type User } from "../../db/schema.js";
import { ApiError } from "../errors/api-error.js";
import type { LoginInput, RegisterInput } from "./dto/auth.dto.js";

const issuer = "task-management-api";
const audience = "task-management-client";
const accessKey = new TextEncoder().encode(env.accessTokenSecret);
const refreshKey = new TextEncoder().encode(env.refreshTokenSecret);

export type PublicUser = Pick<User, "id" | "name" | "email">;

export interface AuthTokens {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(input: RegisterInput): Promise<AuthTokens> {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return db.transaction(async (transaction) => {
    const [user] = await transaction
      .insert(usersTable)
      .values({ name: input.name, email: input.email, passwordHash })
      .returning();

    if (!user) throw new Error("User insert returned no row.");
    const { tokens, sessionRecord } = await createSessionArtifacts(user);
    await transaction.insert(refreshSessionsTable).values(sessionRecord);
    return tokens;
  });
}

export async function loginUser(input: LoginInput): Promise<AuthTokens> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, input.email)).limit(1);

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  return createSession(user);
}

export async function refreshSession(token: string): Promise<AuthTokens> {
  let payload;
  try {
    ({ payload } = await jwtVerify(token, refreshKey, { issuer, audience }));
  } catch {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Your session has expired. Please log in again.");
  }

  const sessionId = payload.jti;
  const userId = Number(payload.sub);
  if (payload.token_use !== "refresh" || !sessionId || !Number.isInteger(userId) || userId < 1) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Your session has expired. Please log in again.");
  }

  const oldTokenHash = hashToken(token);
  const nextRefreshToken = await signRefreshToken(userId, sessionId);
  const nextTokenHash = hashToken(nextRefreshToken);
  const nextExpiresAt = new Date(Date.now() + env.refreshTokenTtlSeconds * 1000);

  const [rotatedSession] = await db
    .update(refreshSessionsTable)
    .set({ tokenHash: nextTokenHash, expiresAt: nextExpiresAt })
    .where(
      and(
        eq(refreshSessionsTable.id, sessionId),
        eq(refreshSessionsTable.userId, userId),
        eq(refreshSessionsTable.tokenHash, oldTokenHash),
        isNull(refreshSessionsTable.revokedAt),
        gt(refreshSessionsTable.expiresAt, new Date()),
      ),
    )
    .returning({ userId: refreshSessionsTable.userId });

  if (!rotatedSession) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Your session has expired. Please log in again.");
  }

  const user = await findPublicUser(userId);
  if (!user) throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Your session has expired. Please log in again.");

  return {
    user,
    accessToken: await signAccessToken(user),
    refreshToken: nextRefreshToken,
  };
}

export async function revokeRefreshSession(token: string | undefined): Promise<void> {
  if (!token) return;

  await db
    .update(refreshSessionsTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshSessionsTable.tokenHash, hashToken(token)), isNull(refreshSessionsTable.revokedAt)));
}

export async function findPublicUser(userId: number): Promise<PublicUser | undefined> {
  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user;
}

export async function verifyAccessToken(token: string): Promise<PublicUser> {
  let payload;
  try {
    ({ payload } = await jwtVerify(token, accessKey, { issuer, audience }));
  } catch {
    throw new ApiError(401, "UNAUTHENTICATED", "Please log in to continue.");
  }

  const userId = Number(payload.sub);
  if (payload.token_use !== "access" || !Number.isInteger(userId) || userId < 1) {
    throw new ApiError(401, "UNAUTHENTICATED", "Please log in to continue.");
  }

  const user = await findPublicUser(userId);
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Please log in to continue.");
  return user;
}

async function createSession(user: User): Promise<AuthTokens> {
  const { tokens, sessionRecord } = await createSessionArtifacts(user);
  await db.insert(refreshSessionsTable).values(sessionRecord);
  return tokens;
}

async function createSessionArtifacts(user: User): Promise<{
  tokens: AuthTokens;
  sessionRecord: typeof refreshSessionsTable.$inferInsert;
}> {
  const sessionId = randomUUID();
  const publicUser = toPublicUser(user);
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(publicUser),
    signRefreshToken(user.id, sessionId),
  ]);

  return {
    tokens: { user: publicUser, accessToken, refreshToken },
    sessionRecord: {
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.refreshTokenTtlSeconds * 1000),
    },
  };
}

function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}

async function signAccessToken(user: PublicUser): Promise<string> {
  return new SignJWT({ token_use: "access" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + env.accessTokenTtlSeconds)
    .sign(accessKey);
}

async function signRefreshToken(userId: number, sessionId: string): Promise<string> {
  return new SignJWT({ token_use: "refresh" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(String(userId))
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + env.refreshTokenTtlSeconds)
    .sign(refreshKey);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
