import type { CookieOptions, Response } from "express";
import { env } from "../../env.js";
import type { AuthTokens } from "./auth.service.js";

export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";

const sharedCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  path: "/",
};

export function setAuthCookies(response: Response, tokens: AuthTokens): void {
  response.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...sharedCookieOptions,
    maxAge: env.accessTokenTtlSeconds * 1000,
  });
  response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...sharedCookieOptions,
    maxAge: env.refreshTokenTtlSeconds * 1000,
  });
}

export function clearAuthCookies(response: Response): void {
  response.clearCookie(ACCESS_COOKIE, sharedCookieOptions);
  response.clearCookie(REFRESH_COOKIE, sharedCookieOptions);
}
