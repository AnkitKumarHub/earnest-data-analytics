import type { RequestHandler } from "express";
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "./auth.cookies.js";
import { loginSchema, registerSchema } from "./dto/auth.dto.js";
import {
  findPublicUser,
  loginUser,
  refreshSession,
  registerUser,
  revokeRefreshSession,
} from "./auth.service.js";
import { ApiError } from "../errors/api-error.js";
import { parseInput } from "../validation/parse.js";

export const register: RequestHandler = async (request, response) => {
  const input = parseInput(registerSchema, request.body);
  const tokens = await registerUser(input);
  setAuthCookies(response, tokens);
  response.status(201).json({ data: { user: tokens.user } });
};

export const login: RequestHandler = async (request, response) => {
  const input = parseInput(loginSchema, request.body);
  const tokens = await loginUser(input);
  setAuthCookies(response, tokens);
  response.status(200).json({ data: { user: tokens.user } });
};

export const refresh: RequestHandler = async (request, response) => {
  const refreshToken = request.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!refreshToken) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Your session has expired. Please log in again.");
  }

  const tokens = await refreshSession(refreshToken);
  setAuthCookies(response, tokens);
  response.status(200).json({ data: { user: tokens.user } });
};

export const logout: RequestHandler = async (request, response) => {
  const refreshToken = request.cookies?.[REFRESH_COOKIE] as string | undefined;
  await revokeRefreshSession(refreshToken);
  clearAuthCookies(response);
  response.status(204).end();
};

export const me: RequestHandler = async (request, response) => {
  const user = request.user;
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Please log in to continue.");

  const currentUser = await findPublicUser(user.id);
  if (!currentUser) throw new ApiError(401, "UNAUTHENTICATED", "Please log in to continue.");
  response.status(200).json({ data: { user: currentUser } });
};
