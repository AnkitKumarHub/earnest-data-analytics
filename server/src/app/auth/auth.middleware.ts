import type { RequestHandler } from "express";
import { env } from "../../env.js";
import { ApiError } from "../errors/api-error.js";
import { ACCESS_COOKIE } from "./auth.cookies.js";
import { verifyAccessToken } from "./auth.service.js";

export const requireAuth: RequestHandler = async (request, _response, next) => {
  const accessToken = request.cookies?.[ACCESS_COOKIE] as string | undefined;
  if (!accessToken) {
    throw new ApiError(401, "UNAUTHENTICATED", "Please log in to continue.");
  }

  request.user = await verifyAccessToken(accessToken);
  next();
};

export const verifyRequestOrigin: RequestHandler = (request, _response, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    next();
    return;
  }

  const origin = request.get("origin");
  if (origin && origin !== env.frontendOrigin) {
    next(new ApiError(403, "ORIGIN_NOT_ALLOWED", "This request origin is not allowed."));
    return;
  }

  if (!origin && env.cookieSameSite === "none") {
    next(new ApiError(403, "ORIGIN_REQUIRED", "An Origin header is required for this request."));
    return;
  }

  next();
};
