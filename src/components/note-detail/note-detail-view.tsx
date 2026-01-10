"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  X,
  ChevronRight,
  Pin,
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Trash2,
  Loader2,
  Check,
  Clock,
  Plus,
  Sparkles,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Item, Subtask, Bucket } from "@/types";
import type { ADFDocument } from "@/lib/adf";
import { adfToPlainText, plainTextToADF } from "@/lib/adf";
import { PlateEditor, MediaToolbar, SelectionToolbar } from "@/components/rich-editor";

// ============================================
// Task Item Component
// ============================================

interface TaskItemProps {
  task: Subtask;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (text: string) => void;
}

function TaskItem({ task, onToggle, onDelete, onUpdate }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(editText.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditText(task.text);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg transition-all group",
        task.completed
          ? "bg-white/[0.01]"
          : "bg-white/[0.02] hover:bg-white/[0.04]"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all",
          task.completed
            ? "bg-violet-500/20 border-violet-500/40"
            : "border-white/20 hover:border-violet-400"
        )}
      >
        {task.completed && (
          <Check className="w-3 h-3 text-violet-400" strokeWidth={3} />
        )}
      </button>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 text-[14px] bg-white/[0.05] border border-white/[0.1] rounded px-2 py-1 text-white/90 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        />
      ) : (
        <span
          className={cn(
            "flex-1 text-[14px] cursor-text",
            task.completed ? "text-white/30 line-through" : "text-white/70"
          )}
          onDoubleClick={() => setIsEditing(true)}
        >
          {task.text}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-rose-400 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ============================================
// Types
// ============================================

export interface NoteDetailViewProps {
  item: Item;
  onClose: () => void;
  onUpdate: (updates: Partial<Item>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onImageUpload?: (file: File) => Promise<string>;
  className?: string;
}

type SaveStatus = "idle" | "saving" | "saved";

// ============================================
// Color config (matching prototype)
// ============================================

const bucketColors: Record<Bucket | "default", { bg: string; dot: string; glow: string; text: string }> = {
  management: { bg: "bg-slate-500", dot: "bg-slate-400", glow: "shadow-slate-500/50", text: "text-slate-400" },
  rfa: { bg: "bg-blue-500", dot: "bg-blue-400", glow: "shadow-blue-500/50", text: "text-blue-400" },
  cxc: { bg: "bg-cyan-500", dot: "bg-cyan-400", glow: "shadow-cyan-500/50", text: "text-cyan-400" },
  paper: { bg: "bg-yellow-500", dot: "bg-yellow-400", glow: "shadow-yellow-500/50", text: "text-yellow-400" },
  video: { bg: "bg-rose-500", dot: "bg-rose-400", glow: "shadow-rose-500/50", text: "text-rose-400" },
  life: { bg: "bg-emerald-500", dot: "bg-emerald-400", glow: "shadow-emerald-500/50", text: "text-emerald-400" },
  game: { bg: "bg-amber-500", dot: "bg-amber-400", glow: "shadow-amber-500/50", text: "text-amber-400" },
  default: { bg: "bg-violet-500", dot: "bg-violet-400", glow: "shadow-violet-500/50", text: "text-violet-400" },
};

// ============================================
// Component
// ============================================

export function NoteDetailView({
  item,
  onClose,
  onUpdate,
  onDelete,
  onImageUpload,
  className,
}: NoteDetailViewProps) {
  // Local state
  const [title, setTitle] = useState(item.summary || "");
  const [adfContent, setAdfContent] = useState<ADFDocument | null>(
    item.adf_content || (item.body ? plainTextToADF(item.body) : null)
  );
  const [subtasks, setSubtasks] = useState<Subtask[]>(item.subtasks || []);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [selection, setSelection] = useState<{ text: string; range: Range } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousItemIdRef = useRef<string | null>(null);

  const color = bucketColors[item.bucket || "default"] || bucketColors.default;

  // Update internal state when item prop changes (e.g., when selecting a different note)
  useEffect(() => {
    // Only update if the item ID has changed (different note selected)
    // This prevents overwriting user edits when the same item is updated from the server
    if (previousItemIdRef.current !== item.id) {
      setTitle(item.summary || "");
      setAdfContent(item.adf_content || (item.body ? plainTextToADF(item.body) : null));
      setSubtasks(item.subtasks || []);
      setSaveStatus("idle");
      setSelection(null);
      setIsEditing(false);
      previousItemIdRef.current = item.id;
    }
  }, [item.id]); // Only depend on item.id to prevent overwriting edits

  // Auto-save on content change
  const saveChanges = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const plainText = adfContent ? adfToPlainText(adfContent) : "";
      await onUpdate({
        summary: title || null,
        body: plainText,
        adf_content: adfContent,
        subtasks,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save:", error);
      setSaveStatus("idle");
    }
  }, [title, adfContent, subtasks, onUpdate]);

  // Debounced auto-save
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveChanges();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, adfContent, subtasks, saveChanges]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lightboxImage) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, lightboxImage]);

  // Handle text selection
  const handleTextSelect = useCallback((text: string, range: Range) => {
    setSelection({ text, range });
  }, []);

  // Create task from selection
  const handleCreateTask = useCallback(() => {
    if (!selection) return;

    const newSubtask: Subtask = {
      id: `st-${Date.now()}`,
      text: selection.text,
      completed: false,
      created_at: new Date().toISOString(),
    };

    setSubtasks((prev) => [...prev, newSubtask]);
    setSelection(null);
  }, [selection]);

  // Toggle subtask completion
  const handleToggleSubtask = useCallback((id: string) => {
    setSubtasks((prev) =>
      prev.map((st) =>
        st.id === id ? { ...st, completed: !st.completed } : st
      )
    );
  }, []);

  // Delete subtask
  const handleDeleteSubtask = useCallback((id: string) => {
    setSubtasks((prev) => prev.filter((st) => st.id !== id));
  }, []);

  // Handle content change
  const handleContentChange = useCallback((doc: ADFDocument) => {
    setAdfContent(doc);
    setIsEditing(true);
  }, []);

  // Handle file upload for media toolbar
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!onImageUpload) return;
      try {
        const url = await onImageUpload(file);
        // Insert into editor
        const editor = editorRef.current;
        if (editor && (editor as HTMLDivElement & { insertImage?: (url: string, alt?: string) => void }).insertImage) {
          (editor as HTMLDivElement & { insertImage: (url: string, alt?: string) => void }).insertImage(url, file.name);
        }
      } catch (error) {
        console.error("Failed to upload image:", error);
      }
    },
    [onImageUpload]
  );

  // Handle URL-based image add
  const handleImageUrl = useCallback((url: string, alt?: string) => {
    const editor = editorRef.current;
    if (editor && (editor as HTMLDivElement & { insertImage?: (url: string, alt?: string) => void }).insertImage) {
      (editor as HTMLDivElement & { insertImage: (url: string, alt?: string) => void }).insertImage(url, alt);
    }
  }, []);

  // Handle link add
  const handleLinkAdd = useCallback((url: string, text?: string) => {
    const editor = editorRef.current;
    if (editor && (editor as HTMLDivElement & { insertLink?: (url: string, text?: string) => void }).insertLink) {
      (editor as HTMLDivElement & { insertLink: (url: string, text?: string) => void }).insertLink(url, text);
    }
  }, []);

  return (
    <div className={cn("relative h-full w-full bg-[#0a0a0b] flex flex-col", className)}>
      {/* Ambient glow - more subtle and positioned better */}
      <div
        className={cn(
          "fixed top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[150px] opacity-10 pointer-events-none transition-opacity duration-1000",
          color.bg
        )}
      />
      {/* Additional subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.01] to-transparent pointer-events-none" />

      <div className="relative h-full flex w-full min-w-0 z-10">
        {/* Main Editor */}
        <main className="flex-1 flex flex-col min-w-0 bg-transparent">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#09090b]/30 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              {/* Mobile back button */}
              <button
                onClick={onClose}
                className="lg:hidden flex items-center gap-2 px-3 py-2 -ml-2 text-[13px] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {/* Breadcrumb */}
              <div className="hidden lg:flex items-center gap-2 text-[13px] text-white/30">
                <span className="capitalize">{item.bucket || "inbox"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-white/60 truncate max-w-[200px]">
                  {title || "Untitled"}
                </span>
              </div>

              {/* Save status */}
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all duration-300",
                  saveStatus === "saving" && "text-amber-400 bg-amber-500/10",
                  saveStatus === "saved" && "text-emerald-400 bg-emerald-500/10",
                  saveStatus === "idle" && "text-white/20"
                )}
              >
                {saveStatus === "saving" && (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <Check className="w-3 h-3" />
                    Saved
                  </>
                )}
                {saveStatus === "idle" && (
                  <>
                    <Clock className="w-3 h-3" />
                    Auto-save
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdate({ pinned: !item.pinned })}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  item.pinned
                    ? "text-amber-400 bg-amber-500/10"
                    : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                )}
                title={item.pinned ? "Unpin" : "Pin"}
              >
                <Pin className="w-4 h-4" />
              </button>
              <button
                onClick={() => onUpdate({ status: item.status === "archived" ? "active" : "archived" })}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  item.status === "archived"
                    ? "text-violet-400 bg-violet-500/10"
                    : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                )}
                title={item.status === "archived" ? "Unarchive" : "Archive"}
              >
                {item.status === "archived" ? (
                  <ArchiveRestore className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
              </button>
              <button className="p-2 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all">
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* Close button */}
              <button
                onClick={onClose}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all"
              >
                <span className="text-[11px]">ESC</span>
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="lg:hidden p-2 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Editor content */}
          <div
            className="flex-1 overflow-auto bg-gradient-to-br from-[#0a0a0b] via-[#09090b] to-[#0a0a0b]"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
          >
            <div className="max-w-5xl mx-auto px-8 lg:px-12 xl:px-16 py-12">
              {/* Properties bar */}
              <div className="flex items-center gap-4 mb-6 flex-wrap" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full shadow-lg", color.dot, color.glow)} />
                  <select
                    value={item.bucket || ""}
                    onChange={(e) => onUpdate({ bucket: (e.target.value || null) as Bucket | null })}
                    className="text-[11px] text-white/30 uppercase tracking-widest font-medium bg-transparent hover:text-white/50 cursor-pointer outline-none border-none appearance-none pr-4"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")", backgroundPosition: "right 0 center", backgroundRepeat: "no-repeat", backgroundSize: "16px" }}
                  >
                    <option value="">inbox</option>
                    <option value="management">management</option>
                    <option value="rfa">rfa</option>
                    <option value="cxc">cxc</option>
                    <option value="paper">paper</option>
                    <option value="video">video</option>
                    <option value="life">life</option>
                    <option value="game">game</option>
                  </select>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <button
                  onClick={() => onUpdate({ pinned: !item.pinned })}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-all",
                    item.pinned
                      ? "text-amber-400 bg-amber-500/10"
                      : "text-white/30 hover:text-white/50 hover:bg-white/[0.04]"
                  )}
                >
                  <Pin className="w-3 h-3" />
                  {item.pinned ? "Pinned" : "Pin"}
                </button>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-white/30" />
                  <input
                    type="date"
                    value={item.due_date?.split("T")[0] || ""}
                    onChange={(e) => onUpdate({ due_date: e.target.value || null })}
                    placeholder="Due date"
                    className="text-[11px] text-white/40 bg-transparent hover:text-white/60 cursor-pointer outline-none border-none [color-scheme:dark]"
                  />
                </div>
                {item.auto_tags && item.auto_tags.length > 0 && (
                  <>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.auto_tags.map((tag) => (
                        <span key={tag} className="text-[10px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsEditing(true);
                }}
                onBlur={() => setIsEditing(false)}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-[36px] lg:text-[42px] font-bold bg-transparent outline-none placeholder:text-white/10 text-white/95 leading-tight tracking-tight mb-2"
                placeholder="Untitled"
              />

              {/* Rich Editor */}
              <div className="mt-8" onClick={(e) => e.stopPropagation()}>
                <PlateEditor
                  value={adfContent}
                  onChange={(newContent) => {
                    handleContentChange(newContent);
                    setIsEditing(true);
                  }}
                  onTextSelect={handleTextSelect}
                  onImageUpload={onImageUpload}
                  onImageClick={setLightboxImage}
                  placeholder="Start writing..."
                />
              </div>

              {/* Media Toolbar */}
              <MediaToolbar
                onFileSelect={handleFileSelect}
                onImageUrl={handleImageUrl}
                onLinkAdd={handleLinkAdd}
              />

              {/* Task Section - Always visible */}
              <div className="mt-12 pt-8 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", color.bg)}>
                      <Check className={cn("w-4 h-4", "text-white")} />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-semibold text-white/90">Tasks</h4>
                      <p className="text-[12px] text-white/30">
                        {subtasks.length > 0
                          ? `${subtasks.filter((t) => t.completed).length} / ${subtasks.length} completed`
                          : "タスクを追加してください"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newSubtask: Subtask = {
                        id: `st-${Date.now()}`,
                        text: "新しいタスク",
                        completed: false,
                        created_at: new Date().toISOString(),
                      };
                      setSubtasks((prev) => [...prev, newSubtask]);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add task
                  </button>
                </div>

                {subtasks.length > 0 ? (
                  <div className="space-y-2">
                    {subtasks
                      .filter((t) => !t.completed)
                      .map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggle={() => handleToggleSubtask(task.id)}
                          onDelete={() => handleDeleteSubtask(task.id)}
                          onUpdate={(text) => {
                            setSubtasks((prev) =>
                              prev.map((t) => (t.id === task.id ? { ...t, text } : t))
                            );
                          }}
                        />
                      ))}

                    {subtasks.filter((t) => t.completed).length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/[0.06]">
                        <p className="text-[11px] text-white/30 mb-3 uppercase tracking-wider">
                          Completed ({subtasks.filter((t) => t.completed).length})
                        </p>
                        <div className="space-y-2">
                          {subtasks
                            .filter((t) => t.completed)
                            .map((task) => (
                              <TaskItem
                                key={task.id}
                                task={task}
                                onToggle={() => handleToggleSubtask(task.id)}
                                onDelete={() => handleDeleteSubtask(task.id)}
                                onUpdate={(text) => {
                                  setSubtasks((prev) =>
                                    prev.map((t) => (t.id === task.id ? { ...t, text } : t))
                                  );
                                }}
                              />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/30">
                    <p className="text-[13px] mb-2">タスクがありません</p>
                    <p className="text-[11px] text-white/20">「Add task」ボタンをクリックして追加してください</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between bg-[#09090b]/30 backdrop-blur-sm">
            <div className="flex items-center gap-4 text-[11px] text-white/20">
              <span>{adfContent ? adfToPlainText(adfContent).length : 0} chars</span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span>Last saved {new Date(item.updated_at).toLocaleString("ja-JP")}</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-white/25 hover:text-white/50 hover:bg-white/[0.04] rounded-lg transition-all">
                <Archive className="w-3.5 h-3.5" />
                Archive
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-white/25 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
          </footer>
        </main>
      </div>

      {/* Selection Toolbar */}
      {selection && (
        <SelectionToolbar
          selectedText={selection.text}
          onCreateTask={handleCreateTask}
          onAskAI={(text) => {
            console.log("Ask AI:", text);
            setSelection(null);
          }}
          onSetDue={(text) => {
            console.log("Set due:", text);
            setSelection(null);
          }}
          onClose={() => setSelection(null)}
        />
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/[0.1] rounded-lg transition-all"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default NoteDetailView;
