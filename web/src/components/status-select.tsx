import { ChevronDown } from "lucide-react";
import type { TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

function statusLabel(status: TaskStatus) {
  return OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function statusDotClass(status: TaskStatus) {
  if (status === "completed") return "bg-green-600 dark:bg-green-400";
  if (status === "in_progress") return "bg-purple-600 dark:bg-purple-400";
  return "bg-neutral-400 dark:bg-neutral-500";
}

type StatusSelectProps = {
  value: TaskStatus;
  onValueChange: (value: TaskStatus) => void;
  disabled?: boolean;
  id?: string;
  "aria-label": string;
  className?: string;
};

export function StatusSelect({
  value,
  onValueChange,
  disabled,
  id,
  "aria-label": ariaLabel,
  className,
}: StatusSelectProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            inputClass,
            "inline-flex w-full min-w-[8.5rem] items-center justify-between gap-2 px-2.5 text-left font-normal",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className={cn("size-1.5 shrink-0 rounded-full", statusDotClass(value))} aria-hidden="true" />
            <span className="truncate">{statusLabel(value)}</span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onValueChange(next as TaskStatus)}
        >
          {OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <span className={cn("size-1.5 shrink-0 rounded-full", statusDotClass(option.value))} aria-hidden="true" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
