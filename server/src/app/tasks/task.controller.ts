import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error.js";
import { parseInput } from "../validation/parse.js";
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdSchema,
  updateTaskSchema,
} from "./dto/task.dto.js";
import { createTask, deleteTask, getTask, listTasks, updateTask } from "./task.service.js";

function currentUserId(request: Parameters<RequestHandler>[0]): number {
  if (!request.user) throw new ApiError(401, "UNAUTHENTICATED", "Please log in to continue.");
  return request.user.id;
}

function taskId(request: Parameters<RequestHandler>[0]): number {
  return parseInput(taskIdSchema, request.params.id);
}

export const list: RequestHandler = async (request, response) => {
  const query = parseInput(listTasksQuerySchema, request.query);
  const result = await listTasks(currentUserId(request), query);
  response.status(200).json({ data: result });
};

export const get: RequestHandler = async (request, response) => {
  const task = await getTask(currentUserId(request), taskId(request));
  response.status(200).json({ data: { task } });
};

export const create: RequestHandler = async (request, response) => {
  const input = parseInput(createTaskSchema, request.body);
  const task = await createTask(currentUserId(request), input);
  response.status(201).json({ data: { task } });
};

export const update: RequestHandler = async (request, response) => {
  const input = parseInput(updateTaskSchema, request.body);
  const task = await updateTask(currentUserId(request), taskId(request), input);
  response.status(200).json({ data: { task } });
};

export const remove: RequestHandler = async (request, response) => {
  await deleteTask(currentUserId(request), taskId(request));
  response.status(204).end();
};
