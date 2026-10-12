import { useEffect, useState, type FormEvent } from "react";
import { getApiError, taskApi } from "@/lib/api";
import type { Task, TaskStatus } from "@/lib/types";
import { DatePicker } from "@/components/date-picker";
import { StatusSelect } from "@/components/status-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

interface TaskDialogProps {
  open: boolean;
  task?: Task | null;
  onClose: () => void;
  onSaved: (task: Task, wasCreated: boolean) => void;
}

export function TaskDialog({ open, task, onClose, onSaved }: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isEditing = Boolean(task);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setDueDate(task?.dueDate ?? "");
    setStatus(task?.status ?? "pending");
    setMessage("");
    setFieldErrors({});
    setSubmitting(false);
  }, [open, task]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "A task title is required.";
    if (!dueDate) errors.dueDate = "A due date is required.";
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setMessage("");
      return;
    }
    setSubmitting(true);
    setMessage("");
    setFieldErrors({});
    try {
      const normalizedDescription = description.trim();
      const savedTask = task
        ? await taskApi.update(task.id, {
            title: title.trim(),
            description: normalizedDescription || null,
            dueDate,
            status,
          })
        : await taskApi.create({
            title: title.trim(),
            ...(normalizedDescription ? { description: normalizedDescription } : {}),
            dueDate,
          });
      onSaved(savedTask, !task);
      onClose();
    } catch (error) {
      const apiError = getApiError(error);
      setMessage(apiError.message);
      setFieldErrors(apiError.fields);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      busy={submitting}
      title={isEditing ? "Edit task" : "Add task"}
      className="max-w-lg overscroll-contain"
    >
      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        {message && (
          <p role="alert" className="rounded-md border border-red-600/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {message}
          </p>
        )}
        <Field label="Task title" error={fieldErrors.title}>
          <Input
            name="title"
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to get done?"
            autoComplete="off"
          />
        </Field>
        <Field label="Description" aside="Optional" error={fieldErrors.description}>
          <Textarea
            name="description"
            maxLength={5000}
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add a note to help you get started…"
          />
        </Field>
        <div className={`grid gap-4 ${isEditing ? "sm:grid-cols-2" : ""}`}>
          <Field label="Due date" error={fieldErrors.dueDate}>
            <DatePicker value={dueDate} onChange={setDueDate} required />
          </Field>
          {isEditing && (
            <Field label="Status">
              <StatusSelect
                value={status}
                onValueChange={setStatus}
                aria-label="Status"
                className="w-full"
              />
            </Field>
          )}
        </div>
        <DialogActions>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="solid" disabled={submitting} iconRight={null} aria-busy={submitting || undefined}>
            {submitting ? (
              <>
                <Spinner className="size-4" />
                Saving…
              </>
            ) : isEditing ? (
              "Save changes"
            ) : (
              "Add task"
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
