import type { ErrorRequestHandler, RequestHandler } from "express";
import { ApiError } from "./api-error.js";

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new ApiError(404, "NOT_FOUND", "The requested resource was not found."));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    });
    return;
  }

  if (isRecord(error) && error.code === "23505") {
    response.status(409).json({
      error: { code: "CONFLICT", message: "A record with those details already exists." },
    });
    return;
  }

  if (isRecord(error) && error.type === "entity.parse.failed") {
    response.status(400).json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON." } });
    return;
  }

  if (isRecord(error) && error.type === "entity.too.large") {
    response.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large." } });
    return;
  }

  response.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." },
  });
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
