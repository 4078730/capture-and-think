"use client";

import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DueDatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  className?: string;
}

export function DueDatePicker({ value, onChange, className }: DueDatePickerProps) {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const isOverdue = value && value < today;
  const isToday = value === today;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <input
            type="date"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            className={cn(
              "w-full pl-10 pr-3 py-2 bg-[var(--secondary)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]",
              isOverdue && "text-red-500",
              isToday && "text-amber-500"
            )}
          />
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick select buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(today)}
          className={cn(
            "px-3 py-1 text-xs rounded-full transition-colors",
            value === today
              ? "bg-amber-500 text-white"
              : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/80"
          )}
        >
          今日
        </button>
        <button
          type="button"
          onClick={() => onChange(tomorrow)}
          className={cn(
            "px-3 py-1 text-xs rounded-full transition-colors",
            value === tomorrow
              ? "bg-[var(--primary)] text-white"
              : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/80"
          )}
        >
          明日
        </button>
        <button
          type="button"
          onClick={() => onChange(nextWeek)}
          className={cn(
            "px-3 py-1 text-xs rounded-full transition-colors",
            value === nextWeek
              ? "bg-[var(--primary)] text-white"
              : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]/80"
          )}
        >
          来週
        </button>
      </div>
    </div>
  );
}

// Badge component for displaying due date status
export function DueDateBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null;

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = dueDate < today;
  const isToday = dueDate === today;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const isTomorrow = dueDate === tomorrow;

  let label: string;
  let colorClass: string;

  if (isOverdue) {
    const days = Math.ceil((new Date(today).getTime() - new Date(dueDate).getTime()) / 86400000);
    label = `${days}日超過`;
    colorClass = "bg-red-500 text-white";
  } else if (isToday) {
    label = "今日";
    colorClass = "bg-amber-500 text-white";
  } else if (isTomorrow) {
    label = "明日";
    colorClass = "bg-blue-500 text-white";
  } else {
    const date = new Date(dueDate);
    label = `${date.getMonth() + 1}/${date.getDate()}`;
    colorClass = "bg-[var(--secondary)] text-[var(--secondary-foreground)]";
  }

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs", colorClass)}>
      {label}
    </span>
  );
}
