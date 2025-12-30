"use client";

import { useState, useEffect } from "react";
import { X, Star, Archive, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn, formatRelativeTime, getBucketColor } from "@/lib/utils";
import { BucketSelector } from "./bucket-selector";
import type { Item, Bucket } from "@/types";

interface ItemModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: { body?: string; bucket?: Bucket | null }) => Promise<void>;
  onPin: (id: string, pinned: boolean) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function ItemModal({
  item,
  isOpen,
  onClose,
  onUpdate,
  onPin,
  onArchive,
  onDelete,
}: ItemModalProps) {
  const [body, setBody] = useState("");
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setBody(item.body);
      setBucket(item.bucket);
      setIsEditing(false);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const hasChanges = body !== item.body || bucket !== item.bucket;

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(item.id, { body, bucket });
      toast.success("保存しました");
      setIsEditing(false);
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePin = async () => {
    try {
      await onPin(item.id, !item.pinned);
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleArchive = async () => {
    try {
      await onArchive(item.id);
      onClose();
    } catch {
      toast.error("アーカイブに失敗しました");
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm("このアイテムを削除しますか？")) return;

    try {
      await onDelete(item.id);
      onClose();
      toast.success("削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-[var(--background)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            {item.bucket && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-white text-sm",
                  getBucketColor(item.bucket)
                )}
              >
                {item.bucket}
              </span>
            )}
            {item.category && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--secondary)] text-[var(--secondary-foreground)] text-sm">
                {item.category}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[var(--secondary)] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isEditing ? (
            <>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full min-h-[200px] p-3 bg-[var(--secondary)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="メモを入力..."
              />
              <div className="space-y-2">
                <label className="text-sm text-[var(--muted-foreground)]">
                  Bucket
                </label>
                <BucketSelector value={bucket} onChange={setBucket} showAll size="sm" />
              </div>
            </>
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="min-h-[200px] p-3 bg-[var(--secondary)] rounded-lg cursor-pointer hover:bg-[var(--secondary)]/80 transition-colors"
            >
              <p className="whitespace-pre-wrap text-[var(--foreground)]">
                {item.body}
              </p>
            </div>
          )}

          {/* Meta info */}
          <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
            {item.summary && (
              <div>
                <span className="font-medium">要約:</span> {item.summary}
              </div>
            )}
            {item.auto_tags && item.auto_tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.auto_tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div>作成: {formatRelativeTime(item.created_at)}</div>
            {item.triaged_at && (
              <div>分類: {formatRelativeTime(item.triaged_at)}</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePin}
              className={cn(
                "p-2 rounded-lg transition-colors",
                item.pinned
                  ? "bg-yellow-500 text-white"
                  : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-yellow-500"
              )}
            >
              <Star className={cn("w-5 h-5", item.pinned && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={handleArchive}
              className="p-2 bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--destructive)] rounded-lg transition-colors"
            >
              <Archive className="w-5 h-5" />
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--destructive)] rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {isEditing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBody(item.body);
                  setBucket(item.bucket);
                  setIsEditing(false);
                }}
                className="px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                disabled={isSaving}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                保存
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
