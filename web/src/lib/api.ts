import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import type {
  ApiEnvelope,
  ApiErrorEnvelope,
  CreateTaskInput,
  Task,
  TaskListQuery,
  TaskPage,
  UpdateTaskInput,
  User,
} from "./types";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const refreshClient = axios.create({ baseURL, withCredentials: true });
let refreshInFlight: Promise<unknown> | null = null;

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _authRetry?: boolean;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorEnvelope>) => {
    const request = error.config as InternalAxiosRequestConfig | undefined;
    const endpoint = request?.url ?? "";
    const isAuthEndpoint = ["/login", "/register", "/refresh", "/logout"].some((path) => endpoint.endsWith(path));

    if (error.response?.status !== 401 || !request || request._authRetry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    request._authRetry = true;
    try {
      refreshInFlight ??= refreshClient.post("/refresh");
      await refreshInFlight;
      return await api.request(request as AxiosRequestConfig);
    } catch (refreshError) {
      if (typeof window !== "undefined") window.dispatchEvent(new Event("auth:expired"));
      return Promise.reject(refreshError);
    } finally {
      refreshInFlight = null;
    }
  },
);

export function getApiError(error: unknown): { message: string; fields: Record<string, string> } {
  if (axios.isAxiosError<ApiErrorEnvelope>(error)) {
    const body = error.response?.data?.error;
    if (body) return { message: body.message, fields: body.fields ?? {} };
    if (error.code === "ERR_NETWORK") {
      return { message: "We could not reach the server. Check your connection and try again.", fields: {} };
    }
  }

  return { message: "Something went wrong. Please try again.", fields: {} };
}

export const authApi = {
  async register(input: { name: string; email: string; password: string }) {
    const response = await api.post<ApiEnvelope<{ user: User }>>("/register", input);
    return response.data.data.user;
  },
  async login(input: { email: string; password: string }) {
    const response = await api.post<ApiEnvelope<{ user: User }>>("/login", input);
    return response.data.data.user;
  },
  async me() {
    const response = await api.get<ApiEnvelope<{ user: User }>>("/me");
    return response.data.data.user;
  },
  async logout() {
    await api.post("/logout");
  },
};

export const taskApi = {
  async list(query: TaskListQuery, signal?: AbortSignal) {
    const response = await api.get<ApiEnvelope<TaskPage>>("/tasks", { params: query, signal });
    return response.data.data;
  },
  async create(input: CreateTaskInput) {
    const response = await api.post<ApiEnvelope<{ task: Task }>>("/tasks", input);
    return response.data.data.task;
  },
  async update(id: number, input: UpdateTaskInput) {
    const response = await api.patch<ApiEnvelope<{ task: Task }>>(`/tasks/${id}`, input);
    return response.data.data.task;
  },
  async remove(id: number) {
    await api.delete(`/tasks/${id}`);
  },
};
