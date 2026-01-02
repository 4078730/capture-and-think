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
  const bucketColorMap: Record<string, string> = {
    management: "bg-slate-500",
    rfa: "bg-blue-500",
    cxc: "bg-cyan-500",
    paper: "bg-yellow-500",
    video: "bg-blue-500",
    life: "bg-rose-500",
    game: "bg-orange-500",
  };
  const bucketColor = item.bucket ? bucketColorMap[item.bucket] || "bg-gray-500" : "bg-gray-500";
  
  return (
    <div
      className={cn(
        "relative bg-white/[0.02] border border-white/[0.08] rounded-lg overflow-hidden cursor-pointer group transition-all",
        "hover:bg-white/[0.04] hover:border-white/[0.12]"
      )}
      onClick={() => onClick?.(item)}
    >
      {/* Left colored bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1.5",
        bucketColor
      )} />
      
      <div className="flex items-start gap-3 pl-5 pr-4 py-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPin(item.id, !item.pinned);
          }}
          className={cn(
            "mt-0.5 transition-colors flex-shrink-0 z-10",
            item.pinned
              ? "text-yellow-400"
              : "text-white/30 hover:text-yellow-400"
          )}
        >
          <Star className={cn("w-4 h-4", item.pinned && "fill-current")} />
        </button>

        <div className="flex-1 min-w-0">
          {/* Title or first line */}
          <h3 className="text-white/90 font-medium text-sm mb-1.5 line-clamp-2 leading-snug">
            {item.summary || truncateText(item.body, 60)}
          </h3>
          
          {/* Body preview - only show if there's a summary */}
          {item.summary && item.body && (
            <p className="text-white/60 text-xs leading-relaxed line-clamp-2 mb-2.5">
              {truncateText(item.body, 100)}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-white/40">
            {item.category && (
              <span className="px-2 py-0.5 rounded bg-white/[0.05] text-white/50 border border-white/[0.08]">
                {item.category}
              </span>
            )}
            <DueDateBadge dueDate={item.due_date} />
            <SubtaskProgress subtasks={item.subtasks} />
            <span className="text-white/30">{formatRelativeTime(item.created_at)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onArchive(item.id);
          }}
          className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-rose-400 transition-all flex-shrink-0 p-1"
        >
          <Archive className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
