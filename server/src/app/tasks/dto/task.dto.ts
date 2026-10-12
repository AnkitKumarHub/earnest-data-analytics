import { z } from "zod";
import { taskStatuses } from "../../../db/schema.js";

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a calendar date in YYYY-MM-DD format.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "Enter a valid calendar date.");

export const taskStatusSchema = z.enum(taskStatuses);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200, "Title must be 200 characters or fewer."),
  description: z.string().max(5_000, "Description must be 5,000 characters or fewer.").optional(),
  dueDate: calendarDateSchema,
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5_000).nullable().optional(),
  dueDate: calendarDateSchema.optional(),
  status: taskStatusSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

export const taskIdSchema = z.coerce.number().int().positive();

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: taskStatusSchema.optional(),
  dueFrom: calendarDateSchema.optional(),
  dueTo: calendarDateSchema.optional(),
  search: z.string().trim().min(1).max(100).optional(),
}).refine((value) => !value.dueFrom || !value.dueTo || value.dueFrom <= value.dueTo, {
  path: ["dueTo"],
  message: "dueTo must be on or after dueFrom.",
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
