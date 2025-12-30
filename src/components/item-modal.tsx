"use client";

import { useState, useEffect } from "react";
import { X, Star, Archive, Trash2, Loader2, Calendar, ListTodo, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn, formatRelativeTime, getBucketColor } from "@/lib/utils";
import { BucketSelector } from "./bucket-selector";
import { DueDatePicker } from "./due-date-picker";
import { SubtaskList } from "./subtask-list";
import { MemoEditor } from "./memo-editor";
import type { Item, Bucket, Subtask } from "@/types";

interface ItemModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: {
    body?: string;
    bucket?: Bucket | null;
    memo?: string;
    due_date?: string | null;
    subtasks?: Subtask[];
  }) => Promise<void>;
  onPin: (id: string, pinned: boolean) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

type TabType = "content" | "subtasks" | "memo";

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
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [memo, setMemo] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("content");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setBody(item.body);
      setBucket(item.bucket);
      setDueDate(item.due_date);
      setSubtasks(item.subtasks || []);
      setMemo(item.memo || "");
      setIsEditing(false);
      setActiveTab("content");
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const hasChanges =
    body !== item.body ||
    bucket !== item.bucket ||
    dueDate !== item.due_date ||
    memo !== (item.memo || "") ||
    JSON.stringify(subtasks) !== JSON.stringify(item.subtasks || []);

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(item.id, {
        body,
        bucket,
        memo: memo || undefined,
        due_date: dueDate,
        subtasks,
      });
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

  const tabs = [
    { id: "content" as const, label: "内容", icon: FileText },
    { id: "subtasks" as const, label: "サブタスク", icon: ListTodo, count: subtasks.length },
    { id: "memo" as const, label: "メモ", icon: Calendar },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-[var(--background)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 flex-wrap">
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
            {item.kind && item.kind !== "unknown" && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-sm">
                {item.kind}
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

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 bg-[var(--secondary)] rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === "content" && (
            <>
              {isEditing ? (
                <>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full min-h-[150px] p-3 bg-[var(--secondary)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted-foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="メモを入力..."
                  />

                  <div className="space-y-2">
                    <label className="text-sm text-[var(--muted-foreground)]">Bucket</label>
                    <BucketSelector value={bucket} onChange={setBucket} showAll size="sm" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-[var(--muted-foreground)]">期限</label>
                    <DueDatePicker value={dueDate} onChange={setDueDate} />
                  </div>
                </>
              ) : (
                <div
                  onClick={() => setIsEditing(true)}
                  className="min-h-[150px] p-3 bg-[var(--secondary)] rounded-lg cursor-pointer hover:bg-[var(--secondary)]/80 transition-colors"
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
                <div className="flex gap-4">
                  <span>作成: {formatRelativeTime(item.created_at)}</span>
                  {item.triaged_at && (
                    <span>分類: {formatRelativeTime(item.triaged_at)}</span>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "subtasks" && (
            <SubtaskList
              subtasks={subtasks}
              onChange={(newSubtasks) => {
                setSubtasks(newSubtasks);
                setIsEditing(true);
              }}
            />
          )}

          {activeTab === "memo" && (
            <MemoEditor
              value={memo}
              onChange={(newMemo) => {
                setMemo(newMemo);
                setIsEditing(true);
              }}
              placeholder="詳細メモを入力..."
              minRows={8}
            />
          )}
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

          {hasChanges && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBody(item.body);
                  setBucket(item.bucket);
                  setDueDate(item.due_date);
                  setSubtasks(item.subtasks || []);
                  setMemo(item.memo || "");
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
                disabled={isSaving}
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
