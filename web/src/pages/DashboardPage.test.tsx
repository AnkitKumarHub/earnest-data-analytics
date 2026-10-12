import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardPage } from "./DashboardPage";

function renderPage(ui: ReactElement, initialEntries: string[] = ["/tasks"]) {
  return render(
    <ThemeProvider defaultTheme="dark" storageKey="daymark-theme-test">
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </ThemeProvider>,
  );
}

const apiMock = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
const authMock = vi.hoisted(() => ({
  user: { id: 1, name: "Asha Sharma", email: "asha@example.com" },
  logout: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  taskApi: apiMock,
  getApiError: (error: unknown) => ({ message: error instanceof Error ? error.message : "Request failed", fields: {} }),
}));
vi.mock("@/auth/auth-context", () => ({ useAuth: () => authMock }));

function CurrentLocation() {
  const location = useLocation();
  return <output aria-label="Current URL">{location.pathname}{location.search}</output>;
}

const sampleTask = {
  id: 8,
  userId: 1,
  title: "Read the assignment brief",
  description: "Capture the frontend scope",
  status: "pending" as const,
  dueDate: "2026-10-30",
  createdAt: "2026-10-12T12:00:00.000Z",
  updatedAt: "2026-10-12T12:00:00.000Z",
};

describe("task dashboard", () => {
  beforeEach(() => {
    apiMock.list.mockReset().mockResolvedValue({
      items: [sampleTask],
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    });
    apiMock.update.mockReset().mockResolvedValue({ ...sampleTask, status: "completed" });
    apiMock.remove.mockReset().mockResolvedValue(undefined);
  });

  it("loads owned tasks and writes status filters into the URL", async () => {
    const user = userEvent.setup();
    renderPage(<><DashboardPage /><CurrentLocation /></>);

    expect(await screen.findByText("Read the assignment brief")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /to do/i }));
    await waitFor(() => expect(screen.getByLabelText("Current URL")).toHaveTextContent("status=pending"));
    expect(apiMock.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: "pending" }), expect.any(AbortSignal));
  });

  it("opens the task form from the empty dashboard state", async () => {
    const user = userEvent.setup();
    apiMock.list.mockResolvedValueOnce({
      items: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
    });
    renderPage(<DashboardPage />);

    await user.click(await screen.findByRole("button", { name: /add your first task/i }));
    expect(screen.getByRole("dialog", { name: "Add task" })).toBeInTheDocument();
    expect(screen.getByLabelText(/task title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeRequired();
  });

  it("creates a task with a required due date and no description when omitted", async () => {
    const user = userEvent.setup();
    apiMock.list.mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
    apiMock.create.mockResolvedValue({ ...sampleTask, title: "Finish wireframes" });
    renderPage(<DashboardPage />);

    await user.click(await screen.findByRole("button", { name: /add your first task/i }));
    const dialog = screen.getByRole("dialog", { name: "Add task" });
    await user.type(within(dialog).getByLabelText(/task title/i), "Finish wireframes");
    await user.type(within(dialog).getByLabelText(/due date/i), "2026-11-03");
    await user.click(within(dialog).getByRole("button", { name: "Add task" }));

    await waitFor(() => expect(apiMock.create).toHaveBeenCalledWith({ title: "Finish wireframes", dueDate: "2026-11-03" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Finish wireframes");
  });

  it("saves edits to an existing task", async () => {
    const user = userEvent.setup();
    apiMock.update.mockImplementation(async (_id: number, input: { title: string }) => ({ ...sampleTask, title: input.title }));
    renderPage(<DashboardPage />);
    await screen.findByText("Read the assignment brief");

    await user.click(screen.getByRole("button", { name: "Edit Read the assignment brief" }));
    const dialog = screen.getByRole("dialog", { name: "Edit task" });
    const titleField = within(dialog).getByLabelText(/task title/i);
    await user.clear(titleField);
    await user.type(titleField, "Review the assignment");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(apiMock.update).toHaveBeenCalledWith(8, {
      title: "Review the assignment",
      description: "Capture the frontend scope",
      dueDate: "2026-10-30",
      status: "pending",
    }));
    expect(await screen.findByRole("status")).toHaveTextContent("Review the assignment");
  });

  it("changes a task status and confirms deletion before calling the API", async () => {
    const user = userEvent.setup();
    renderPage(<DashboardPage />);
    await screen.findByText("Read the assignment brief");

    await user.selectOptions(screen.getByLabelText("Change status for Read the assignment brief"), "completed");
    await waitFor(() => expect(apiMock.update).toHaveBeenCalledWith(8, { status: "completed" }));
    await user.click(screen.getByRole("button", { name: "Delete Read the assignment brief" }));
    const confirmDialog = screen.getByRole("alertdialog", { name: /delete this task/i });
    expect(confirmDialog).toHaveTextContent("Delete “Read the assignment brief”? This can’t be undone.");
    await user.click(within(confirmDialog).getByRole("button", { name: "Delete task" }));
    await waitFor(() => expect(apiMock.remove).toHaveBeenCalledWith(8));
  });

  it("shows a useful list error when loading fails", async () => {
    apiMock.list.mockRejectedValueOnce(new Error("The server is unavailable."));
    renderPage(<DashboardPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("The server is unavailable.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
