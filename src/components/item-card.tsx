"use client";

import { Star, Archive } from "lucide-react";
import { cn, formatRelativeTime, getBucketColor, truncateText } from "@/lib/utils";
import { DueDateBadge } from "./due-date-picker";
import { SubtaskProgress } from "./subtask-list";
import type { Item } from "@/types";

interface ItemCardProps {
  item: Item;
  onPin: (id: string, pinned: boolean) => void;
  onArchive: (id: string) => void;
  onClick?: (item: Item) => void;
}

export function ItemCard({ item, onPin, onArchive, onClick }: ItemCardProps) {
  return (
    <div
      className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 card-hover cursor-pointer touch-feedback"
      onClick={() => onClick?.(item)}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPin(item.id, !item.pinned);
          }}
          className={cn(
            "mt-0.5 transition-colors",
            item.pinned
              ? "text-yellow-500"
              : "text-[var(--muted-foreground)] hover:text-yellow-500"
          )}
        >
          <Star className={cn("w-5 h-5", item.pinned && "fill-current")} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
            {truncateText(item.body, 200)}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[var(--muted-foreground)]">
            {item.bucket && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-white",
                  getBucketColor(item.bucket)
                )}
              >
                {item.bucket}
              </span>
            )}
            {item.category && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--secondary)] text-[var(--secondary-foreground)]">
                {item.category}
              </span>
            )}
            <DueDateBadge dueDate={item.due_date} />
            <SubtaskProgress subtasks={item.subtasks} />
            <span>{formatRelativeTime(item.created_at)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onArchive(item.id);
          }}
          className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
        >
          <Archive className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
