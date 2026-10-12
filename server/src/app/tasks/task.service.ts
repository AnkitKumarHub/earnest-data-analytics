import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
} from "drizzle-orm";
import { db } from "../../db/index.js";
import { tasksTable, type Task } from "../../db/schema.js";
import { ApiError } from "../errors/api-error.js";
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "./dto/task.dto.js";

export interface TaskPage {
  items: Task[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export async function listTasks(userId: number, query: ListTasksQuery): Promise<TaskPage> {
  const conditions = [eq(tasksTable.userId, userId)];
  if (query.status) conditions.push(eq(tasksTable.status, query.status));
  if (query.dueFrom) conditions.push(gte(tasksTable.dueDate, query.dueFrom));
  if (query.dueTo) conditions.push(lte(tasksTable.dueDate, query.dueTo));
  if (query.search) conditions.push(ilike(tasksTable.title, `%${escapeLike(query.search)}%`));
  const where = and(...conditions);
  const offset = (query.page - 1) * query.pageSize;

  const [items, [countRow]] = await Promise.all([
    db
      .select()
      .from(tasksTable)
      .where(where)
      .orderBy(asc(tasksTable.dueDate), desc(tasksTable.createdAt), asc(tasksTable.id))
      .limit(query.pageSize)
      .offset(offset),
    db.select({ totalItems: count() }).from(tasksTable).where(where),
  ]);

  const totalItems = countRow?.totalItems ?? 0;
  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    },
  };
}

export async function getTask(userId: number, taskId: number): Promise<Task> {
  const [task] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.userId, userId)))
    .limit(1);

  if (!task) throw taskNotFound();
  return task;
}

export async function createTask(userId: number, input: CreateTaskInput): Promise<Task> {
  const [task] = await db
    .insert(tasksTable)
    .values({
      userId,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate,
      status: "pending",
    })
    .returning();

  if (!task) throw new Error("Task insert returned no row.");
  return task;
}

export async function updateTask(
  userId: number,
  taskId: number,
  input: UpdateTaskInput,
): Promise<Task> {
  const [task] = await db
    .update(tasksTable)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.userId, userId)))
    .returning();

  if (!task) throw taskNotFound();
  return task;
}

export async function deleteTask(userId: number, taskId: number): Promise<void> {
  const [deleted] = await db
    .delete(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.userId, userId)))
    .returning({ id: tasksTable.id });

  if (!deleted) throw taskNotFound();
}

function taskNotFound(): ApiError {
  return new ApiError(404, "TASK_NOT_FOUND", "Task was not found.");
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
