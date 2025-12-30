"use client";

import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Subtask } from "@/types";

interface SubtaskListProps {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
  readOnly?: boolean;
}

export function SubtaskList({ subtasks, onChange, readOnly = false }: SubtaskListProps) {
  const [newTaskText, setNewTaskText] = useState("");

  const addSubtask = () => {
    if (!newTaskText.trim()) return;

    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      text: newTaskText.trim(),
      completed: false,
      created_at: new Date().toISOString(),
    };

    onChange([...subtasks, newSubtask]);
    setNewTaskText("");
  };

  const toggleSubtask = (id: string) => {
    onChange(
      subtasks.map((st) =>
        st.id === id ? { ...st, completed: !st.completed } : st
      )
    );
  };

  const removeSubtask = (id: string) => {
    onChange(subtasks.filter((st) => st.id !== id));
  };

  const completedCount = subtasks.filter((st) => st.completed).length;

  return (
    <div className="space-y-2">
      {subtasks.length > 0 && (
        <div className="text-xs text-[var(--muted-foreground)]">
          {completedCount}/{subtasks.length} 完了
        </div>
      )}

      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="flex items-center gap-2 group"
          >
            <button
              type="button"
              onClick={() => !readOnly && toggleSubtask(subtask.id)}
              disabled={readOnly}
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                subtask.completed
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-[var(--border)] hover:border-green-500"
              )}
            >
              {subtask.completed && <Check className="w-3 h-3" />}
            </button>

            <span
              className={cn(
                "flex-1 text-sm",
                subtask.completed && "line-through text-[var(--muted-foreground)]"
              )}
            >
              {subtask.text}
            </span>

            {!readOnly && (
              <button
                type="button"
                onClick={() => removeSubtask(subtask.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSubtask()}
            placeholder="サブタスクを追加..."
            className="flex-1 px-3 py-1.5 bg-[var(--secondary)] rounded-lg text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          <button
            type="button"
            onClick={addSubtask}
            disabled={!newTaskText.trim()}
            className="p-1.5 bg-[var(--primary)] text-white rounded-lg disabled:opacity-50 transition-opacity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Progress indicator for item card
export function SubtaskProgress({ subtasks }: { subtasks: Subtask[] }) {
  if (!subtasks || subtasks.length === 0) return null;

  const completed = subtasks.filter((st) => st.completed).length;
  const total = subtasks.length;
  const percentage = Math.round((completed / total) * 100);

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 bg-[var(--secondary)] rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percentage === 100 ? "bg-green-500" : "bg-[var(--primary)]"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-[var(--muted-foreground)]">
        {completed}/{total}
      </span>
    </div>
  );
}
