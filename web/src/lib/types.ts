export interface User {
  id: number;
  name: string;
  email: string;
}

export type TaskStatus = "pending" | "in_progress" | "completed";

export interface Task {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskPage {
  items: Task[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody;
}

export interface TaskListQuery {
  page: number;
  pageSize: number;
  status?: TaskStatus;
  dueFrom?: string;
  dueTo?: string;
  search?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  dueDate?: string;
  status?: TaskStatus;
}
