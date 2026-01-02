"use client";

import { cn, getBucketColor } from "@/lib/utils";
import type { Bucket } from "@/types";

interface BucketSelectorProps {
  value: Bucket | null;
  onChange: (bucket: Bucket | null) => void;
  showAll?: boolean;
  size?: "sm" | "md";
}

const buckets: { value: Bucket; label: string }[] = [
  { value: "management", label: "Management" },
  { value: "rfa", label: "RFA" },
  { value: "cxc", label: "CXC" },
  { value: "paper", label: "Paper" },
  { value: "video", label: "Video" },
  { value: "life", label: "Life" },
  { value: "game", label: "Game" },
];

export function BucketSelector({
  value,
  onChange,
  showAll = false,
  size = "md",
}: BucketSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {showAll && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "rounded-full font-medium transition-all",
            size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
            value === null
              ? "bg-[var(--foreground)] text-[var(--background)]"
              : "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--muted)]"
          )}
        >
          All
        </button>
      )}
      {buckets.map((bucket) => (
        <button
          key={bucket.value}
          type="button"
          onClick={() => onChange(value === bucket.value ? null : bucket.value)}
          className={cn(
            "rounded-full font-medium transition-all",
            size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
            value === bucket.value
              ? cn(getBucketColor(bucket.value), "text-white")
              : "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--muted)]"
          )}
        >
          {bucket.label}
        </button>
      ))}
    </div>
  );
}
