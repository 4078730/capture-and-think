"use client";

import { Check, X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Item, Bucket, Kind } from "@/types";
import { cn } from "@/lib/utils";

const bucketLabels: Record<Bucket, string> = {
  work: "仕事",
  management: "管理",
  rfa: "RFA",
  cxc: "CXC",
  paper: "論文",
  video: "動画",
  life: "生活",
  game: "ゲーム",
};

const bucketColors: Record<Bucket, string> = {
  management: "bg-slate-500",
  rfa: "bg-blue-500",
  cxc: "bg-cyan-500",
  paper: "bg-yellow-500",
  video: "bg-purple-500",
  life: "bg-green-500",
  game: "bg-orange-500",
};

const kindLabels: Record<Kind, string> = {
  idea: "アイデア",
  task: "タスク",
  note: "メモ",
  reference: "参考",
  unknown: "不明",
};

interface ApprovalCardProps {
  item: Item;
  onApprove: (id: string, overrides?: { bucket?: Bucket; kind?: Kind }) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function ApprovalCard({ item, onApprove, onReject, isLoading }: ApprovalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(item.ai_suggested_bucket);
  const [selectedKind, setSelectedKind] = useState<Kind | null>(item.ai_suggested_kind);

  const confidence = item.ai_confidence ?? 0;
  const confidenceColor = confidence >= 0.8 ? "text-green-500" : confidence >= 0.5 ? "text-yellow-500" : "text-red-500";

  const handleApprove = () => {
    const overrides: { bucket?: Bucket; kind?: Kind } = {};
    if (selectedBucket && selectedBucket !== item.ai_suggested_bucket) {
      overrides.bucket = selectedBucket;
    }
    if (selectedKind && selectedKind !== item.ai_suggested_kind) {
      overrides.kind = selectedKind;
    }
    onApprove(item.id, Object.keys(overrides).length > 0 ? overrides : undefined);
  };

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Header with AI suggestion summary */}
      <div className="p-4 space-y-3">
        {/* Original content */}
        <p className="text-sm text-[var(--foreground)] line-clamp-3">{item.body}</p>

        {/* AI Suggestions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="w-4 h-4 text-purple-500" />

          {item.ai_suggested_bucket && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs text-white",
              bucketColors[item.ai_suggested_bucket]
            )}>
              {bucketLabels[item.ai_suggested_bucket]}
            </span>
          )}

          {item.ai_suggested_kind && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--secondary)] text-[var(--foreground)]">
              {kindLabels[item.ai_suggested_kind]}
            </span>
          )}

          {item.ai_suggested_category && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--secondary)] text-[var(--muted-foreground)]">
              {item.ai_suggested_category}
            </span>
          )}

          <span className={cn("text-xs ml-auto", confidenceColor)}>
            {Math.round(confidence * 100)}%
          </span>
        </div>

        {/* AI Summary */}
        {item.ai_suggested_summary && (
          <p className="text-xs text-[var(--muted-foreground)] italic">
            &ldquo;{item.ai_suggested_summary}&rdquo;
          </p>
        )}

        {/* Expand/Collapse for editing */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? "閉じる" : "編集して承認"}
        </button>
      </div>

      {/* Expanded edit section */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)] pt-3">
          {/* Bucket selector */}
          <div>
            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">バケット</label>
            <div className="flex gap-2 flex-wrap">
              {(["management", "rfa", "cxc", "paper", "video", "life", "game"] as Bucket[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBucket(b)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs transition-colors",
                    selectedBucket === b
                      ? cn(bucketColors[b], "text-white")
                      : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  {bucketLabels[b]}
                </button>
              ))}
            </div>
          </div>

          {/* Kind selector */}
          <div>
            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">種類</label>
            <div className="flex gap-2 flex-wrap">
              {(["idea", "task", "note", "reference"] as Kind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedKind(k)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs transition-colors",
                    selectedKind === k
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  {kindLabels[k]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex border-t border-[var(--border)]">
        <button
          type="button"
          onClick={() => onReject(item.id)}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          却下
        </button>
        <div className="w-px bg-[var(--border)]" />
        <button
          type="button"
          onClick={handleApprove}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-green-500 hover:bg-green-500/10 transition-colors disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          承認
        </button>
      </div>
    </div>
  );
}
