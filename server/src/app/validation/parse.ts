import { z } from "zod";
import { ApiError } from "../errors/api-error.js";

export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fields = Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join(".") || "request", issue.message]),
  );
  throw new ApiError(400, "VALIDATION_ERROR", "Request validation failed.", fields);
}
