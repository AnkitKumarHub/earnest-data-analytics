import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays, Check, ClipboardList, LogOut, Plus, SquarePen, Trash2, X } from "lucide-react";
import { useAuth } from "@/auth/auth-context";
import { getApiError, taskApi } from "@/lib/api";
import type { Task, TaskPage, TaskStatus } from "@/lib/types";
import { TaskDialog } from "@/pages/TaskDialog";
import { Backdrop } from "@/components/backdrop";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardText, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Highlight } from "@/components/ui/highlight";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 10;
const statuses: { label: string; value: TaskStatus | "all" }[] = [
  { label: "All tasks", value: "all" },
  { label: "To do", value: "pending" },
  { label: "In progress", value: "in_progress" },
  { label: "Done", value: "completed" },
];
const taskStatuses: TaskStatus[] = ["pending", "in_progress", "completed"];

function queryStatus(value: string | null): TaskStatus | undefined {
  return value && taskStatuses.includes(value as TaskStatus) ? (value as TaskStatus) : undefined;
}

function formattedDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const offset = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (offset < 0) return { text: `Overdue · ${formattedDate(value)}`, overdue: true };
  if (offset === 0) return { text: "Due today", overdue: false };
  if (offset === 1) return { text: "Due tomorrow", overdue: false };
  return { text: formattedDate(value), overdue: false };
}

function statusLabel(status: TaskStatus) {
  if (status === "in_progress") return "In progress";
  return status === "completed" ? "Completed" : "Pending";
}

function statusTone(status: TaskStatus): "default" | "success" | "special" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "special";
  return "default";
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchDraftInput, setSearchDraftInput] = useState<string | null>(null);
  const [taskPage, setTaskPage] = useState<TaskPage | null>(null);
  const [queryState, setQueryState] = useState<{ key: string; loading: boolean; error: string }>({
    key: "",
    loading: true,
    error: "",
  });
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const status = queryStatus(searchParams.get("status"));
  const dueFrom = searchParams.get("dueFrom") ?? "";
  const dueTo = searchParams.get("dueTo") ?? "";
  const search = (searchParams.get("search") ?? "").slice(0, 100);
  const searchDraft = searchDraftInput ?? search;
  const pageInfo = taskPage?.pagination;
  const totalPages = Math.max(1, pageInfo?.totalPages ?? 1);
  const tabValue = status ?? "all";

  const requestQuery = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(status ? { status } : {}),
      ...(dueFrom ? { dueFrom } : {}),
      ...(dueTo ? { dueTo } : {}),
      ...(search ? { search } : {}),
    }),
    [page, status, dueFrom, dueTo, search],
  );
  const requestKey = JSON.stringify([requestQuery, refreshKey]);
  const loading = queryState.key !== requestKey || queryState.loading;
  const listError = queryState.key === requestKey ? queryState.error : "";
  const errorMessage = actionError || listError;
  const hasFilters = Boolean(search || status || dueFrom || dueTo);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "/" && !event.altKey && !event.ctrlKey && !event.metaKey && !isTyping) {
        event.preventDefault();
        document.getElementById("task-search")?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void taskApi
      .list(requestQuery, controller.signal)
      .then((result) => {
        setTaskPage(result);
        setQueryState({ key: requestKey, loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setQueryState({ key: requestKey, loading: false, error: getApiError(error).message });
      });
    return () => controller.abort();
  }, [requestQuery, refreshKey, requestKey]);

  useEffect(() => {
    if (searchDraftInput === null) return;
    const timeout = window.setTimeout(() => {
      const normalized = searchDraft.trim().slice(0, 100);
      if (normalized !== search) {
        const next = new URLSearchParams(searchParams);
        if (normalized) next.set("search", normalized);
        else next.delete("search");
        next.delete("page");
        setSearchParams(next, { replace: true });
      }
      setSearchDraftInput(null);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchDraft, searchDraftInput, search, searchParams, setSearchParams]);

  function updateFilters(values: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    setSearchParams(next);
  }

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    setSearchParams(next);
  }

  function openCreate() {
    setEditingTask(null);
    setDialogOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setDialogOpen(true);
  }

  function handleSaved(task: Task, wasCreated: boolean) {
    setNotice(wasCreated ? `“${task.title}” was added to your list.` : `“${task.title}” was updated.`);
    setRefreshKey((key) => key + 1);
  }

  async function changeStatus(task: Task, nextStatus: TaskStatus) {
    if (task.status === nextStatus) return;
    setBusyTaskId(task.id);
    setActionError("");
    setNotice("");
    try {
      const updated = await taskApi.update(task.id, { status: nextStatus });
      setNotice(`“${updated.title}” moved to ${statusLabel(nextStatus).toLowerCase()}.`);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setActionError(getApiError(error).message);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError("");
    setNotice("");
    try {
      await taskApi.remove(deleteTarget.id);
      setNotice(`“${deleteTarget.title}” was deleted.`);
      if (page > 1 && taskPage?.items.length === 1) goToPage(page - 1);
      else setRefreshKey((key) => key + 1);
      setDeleteTarget(null);
    } catch (error) {
      setActionError(getApiError(error).message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setActionError("You were signed out on this device.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="relative isolate min-h-[100dvh] overflow-x-clip bg-background text-foreground">
      <Backdrop />
      <a className="skip-link" href="#main-content">
        Skip to your tasks
      </a>

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6 sm:px-12">
          <Link to="/tasks" className="font-onest text-lg font-semibold tracking-tight text-foreground" aria-label="Daymark task dashboard">
            daymark
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden max-w-[10rem] truncate text-sm text-muted-foreground sm:inline">{user?.name}</span>
            <ThemeSwitcher />
            <IconButton variant="ghost" aria-label="Sign out" title="Sign out" disabled={loggingOut} onClick={() => void handleLogout()}>
              <LogOut />
            </IconButton>
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-12 sm:py-14">
        <div className="space-y-3 sm:text-center">
          <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">My tasks</h1>
          <p className="mx-auto max-w-2xl text-base text-neutral-700 dark:text-neutral-400 md:text-xl">
            Keep a clear list and move <Highlight>one task at a time</Highlight>.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <p>
              Showing{" "}
              <span className="font-semibold text-foreground">{pageInfo?.totalItems ?? 0}</span>{" "}
              {(pageInfo?.totalItems ?? 0) === 1 ? "task" : "tasks"}
            </p>
            {(dueFrom || dueTo) && (
              <>
                <span className="hidden h-4 w-px bg-border sm:block" />
                <span>
                  Dates{dueFrom ? ` from ${dueFrom}` : ""}
                  {dueTo ? ` through ${dueTo}` : ""}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              id="task-search"
              aria-label="Search tasks by title"
              value={searchDraft}
              onChange={(event) => setSearchDraftInput(event.target.value)}
              maxLength={100}
              placeholder="Find a task…"
              wrapperClassName="w-full sm:w-64"
            />
            <Button variant="solid" onClick={openCreate} iconRight={<Plus className="size-4" />}>
              Add task
            </Button>
          </div>
        </div>

        <Tabs
          value={tabValue}
          onValueChange={(value) => updateFilters({ status: value === "all" ? null : value })}
          className="mt-6 gap-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList variant="segmented" aria-label="Filter tasks by status">
              {statuses.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  {item.label}
                  {item.value === "all" && (
                    <span className="text-xs opacity-70">{pageInfo?.totalItems ?? 0}</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                iconRight={null}
                aria-expanded={datesOpen}
                onClick={() => setDatesOpen((open) => !open)}
              >
                <CalendarDays className="size-4" />
                Dates
                {(dueFrom || dueTo) && (
                  <span className="ml-1 rounded-full border border-card-edge px-1.5 text-[11px] text-muted-foreground">
                    {[dueFrom, dueTo].filter(Boolean).length}
                  </span>
                )}
              </Button>
              {datesOpen && (
                <div className="absolute right-0 z-10 mt-2 w-64 space-y-3 rounded-xl border border-card-edge bg-card p-4 text-card-foreground">
                  <p className="text-sm font-medium">Due date range</p>
                  <div className="space-y-1.5">
                    <Label htmlFor="due-from">From</Label>
                    <Input
                      id="due-from"
                      type="date"
                      value={dueFrom}
                      max={dueTo || undefined}
                      onChange={(event) => updateFilters({ dueFrom: event.target.value || null })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="due-to">Through</Label>
                    <Input
                      id="due-to"
                      type="date"
                      value={dueTo}
                      min={dueFrom || undefined}
                      onChange={(event) => updateFilters({ dueTo: event.target.value || null })}
                    />
                  </div>
                  {(dueFrom || dueTo) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      iconRight={null}
                      onClick={() => {
                        updateFilters({ dueFrom: null, dueTo: null });
                        setDatesOpen(false);
                      }}
                    >
                      Clear dates
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </Tabs>

        <section className="mt-6 space-y-4" aria-label="Task list" aria-live="polite" aria-busy={loading}>
          {listError && (
            <Alert tone="danger" title="Could not load tasks">
              <div className="flex flex-wrap items-center gap-3">
                <span>{listError}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  iconRight={null}
                  onClick={() => {
                    setActionError("");
                    setRefreshKey((key) => key + 1);
                  }}
                >
                  Try again
                </Button>
              </div>
            </Alert>
          )}
          {actionError && (
            <Alert tone="danger" title="Something went wrong">
              <div className="flex flex-wrap items-center gap-3">
                <span>{actionError}</span>
                <Button type="button" variant="ghost" size="sm" iconRight={null} onClick={() => setActionError("")}>
                  Dismiss
                </Button>
              </div>
            </Alert>
          )}
          {notice && (
            <div className="relative">
              <Alert tone="success">{notice}</Alert>
              <IconButton
                variant="ghost"
                aria-label="Dismiss message"
                className="absolute top-2 right-2 size-7"
                onClick={() => setNotice("")}
              >
                <X className="size-3.5" />
              </IconButton>
            </div>
          )}

          {loading && (
            <div className="space-y-3" aria-label="Loading tasks">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="card-chai flex gap-4 p-4">
                  <Skeleton className="size-5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !errorMessage && taskPage && taskPage.items.length === 0 && (
            <Card className="items-center py-14 text-center sm:opacity-100">
              <CardBody className="items-center gap-3">
                <div className="grid size-16 place-items-center rounded-2xl border border-card-edge bg-card-fill text-muted-foreground">
                  <ClipboardList className="size-7" aria-hidden="true" />
                </div>
                <CardTitle>{hasFilters ? "No tasks match this view." : "No tasks yet"}</CardTitle>
                <CardText className="max-w-sm">
                  {hasFilters
                    ? "Try another search or clear a filter to see more."
                    : "Add one task to get started."}
                </CardText>
                {hasFilters ? (
                  <Button
                    variant="soft"
                    className="mt-2"
                    iconRight={null}
                    onClick={() => {
                      setSearchDraftInput("");
                      setSearchParams(new URLSearchParams());
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button variant="soft" className="mt-2" onClick={openCreate} iconRight={<Plus className="size-4" />}>
                    Add your first task
                  </Button>
                )}
              </CardBody>
            </Card>
          )}

          {!loading && !errorMessage && taskPage && taskPage.items.length > 0 && (
            <div className="space-y-3">
              {taskPage.items.map((task) => {
                const due = dateLabel(task.dueDate);
                return (
                  <Card key={task.id} className="sm:flex-row sm:items-stretch">
                    <CardBody className="gap-3 sm:flex-row sm:items-start sm:gap-4">
                      <button
                        type="button"
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-150 ${
                          task.status === "completed"
                            ? "border-green-600 bg-green-600 text-white dark:border-green-400 dark:bg-green-400 dark:text-black"
                            : "border-gray-300 bg-transparent text-transparent hover:border-foreground dark:border-gray-600"
                        }`}
                        aria-label={
                          task.status === "completed" ? `Reopen ${task.title}` : `Mark ${task.title} completed`
                        }
                        title={task.status === "completed" ? "Reopen task" : "Mark completed"}
                        disabled={busyTaskId === task.id}
                        onClick={() => void changeStatus(task, task.status === "completed" ? "pending" : "completed")}
                      >
                        {task.status === "completed" && <Check className="size-3" strokeWidth={2.5} />}
                      </button>
                      <div className="min-w-0 flex-1 space-y-2">
                        <CardTitle className={task.status === "completed" ? "text-muted-foreground line-through" : undefined}>
                          {task.title}
                        </CardTitle>
                        {task.description && <CardText>{task.description}</CardText>}
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs ${
                              due.overdue && task.status !== "completed"
                                ? "text-red-700 dark:text-red-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            <CalendarDays className="size-3.5" aria-hidden="true" />
                            {due.text}
                          </span>
                          <Chip tone={statusTone(task.status)}>{statusLabel(task.status)}</Chip>
                        </div>
                      </div>
                      <CardFooter className="mt-0 w-full items-center justify-end gap-2 pt-0 sm:w-auto sm:shrink-0">
                        <label className="sr-only" htmlFor={`status-${task.id}`}>
                          Change status for {task.title}
                        </label>
                        <Select
                          id={`status-${task.id}`}
                          value={task.status}
                          disabled={busyTaskId === task.id}
                          onChange={(event) => void changeStatus(task, event.target.value as TaskStatus)}
                          className="min-w-[8.5rem] text-xs"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In progress</option>
                          <option value="completed">Completed</option>
                        </Select>
                        <IconButton aria-label={`Edit ${task.title}`} onClick={() => openEdit(task)}>
                          <SquarePen />
                        </IconButton>
                        <IconButton
                          aria-label={`Delete ${task.title}`}
                          disabled={busyTaskId === task.id}
                          onClick={() => setDeleteTarget(task)}
                        >
                          <Trash2 />
                        </IconButton>
                      </CardFooter>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}

          {pageInfo && pageInfo.totalItems > 0 && (
            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <strong className="text-foreground">
                  {(pageInfo.page - 1) * pageInfo.pageSize + 1}-{Math.min(pageInfo.page * pageInfo.pageSize, pageInfo.totalItems)}
                </strong>{" "}
                of <strong className="text-foreground">{pageInfo.totalItems}</strong> tasks
              </p>
              <Pagination page={page} total={totalPages} onChange={goToPage} />
            </div>
          )}
        </section>
      </main>

      <TaskDialog open={dialogOpen} task={editingTask} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this task?"
        confirmLabel="Delete task"
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      >
        {deleteTarget ? (
          <p>
            Delete “{deleteTarget.title}”? This can’t be undone.
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
