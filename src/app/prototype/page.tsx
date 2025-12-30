"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Pin, Check, Sparkles, X, ChevronRight, ChevronDown,
  MoreHorizontal, Trash2, Archive, Search,
  Hash, Zap, Film, Heart, Gamepad2, Calendar,
  ArrowLeft, Loader2, Command, Settings, User, Key, ExternalLink, FileText,
  GripVertical, CornerDownRight, Image, Link2, Upload, Globe,
  Save, Clock, ArchiveRestore
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useItems, useUpdateItem, useCreateItem, useArchiveItem, usePinItem } from "@/hooks/use-items";
import type { Item, Bucket, Subtask } from "@/types";
import type { ADFDocument } from "@/lib/adf";
import { adfToPlainText, plainTextToADF } from "@/lib/adf";

// Save status type
type SaveStatus = "idle" | "saving" | "saved" | "error";

// Note type for UI (mapped from Item)
interface Note {
  id: string;
  title: string;
  adfContent: ADFDocument;
  bucket: string;
  pinned: boolean;
  color: string;
  updatedAt: string;
  tags: string[];
  archived: boolean;
  subtasks: Subtask[];
}

// Task type for hierarchical tasks
interface Task {
  id: string;
  title: string;
  noteId: string;
  dueDate: string | null;
  completed: boolean;
  memo: string;
  parentId: string | null;
  depth: number;
}

// Color config
const colorConfig: Record<string, { dot: string; glow: string; bg: string; border: string; text: string; cardBg: string; hoverBorder: string }> = {
  amber: { dot: "bg-amber-400", glow: "shadow-amber-400/50", bg: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-400", cardBg: "from-amber-500/[0.08] to-amber-500/[0.02]", hoverBorder: "hover:border-amber-400/40" },
  blue: { dot: "bg-blue-400", glow: "shadow-blue-400/50", bg: "bg-blue-500/10", border: "border-blue-500/25", text: "text-blue-400", cardBg: "from-blue-500/[0.08] to-blue-500/[0.02]", hoverBorder: "hover:border-blue-400/40" },
  emerald: { dot: "bg-emerald-400", glow: "shadow-emerald-400/50", bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400", cardBg: "from-emerald-500/[0.08] to-emerald-500/[0.02]", hoverBorder: "hover:border-emerald-400/40" },
  rose: { dot: "bg-rose-400", glow: "shadow-rose-400/50", bg: "bg-rose-500/10", border: "border-rose-500/25", text: "text-rose-400", cardBg: "from-rose-500/[0.08] to-rose-500/[0.02]", hoverBorder: "hover:border-rose-400/40" },
  violet: { dot: "bg-violet-400", glow: "shadow-violet-400/50", bg: "bg-violet-500/10", border: "border-violet-500/25", text: "text-violet-400", cardBg: "from-violet-500/[0.08] to-violet-500/[0.02]", hoverBorder: "hover:border-violet-400/40" },
  cyan: { dot: "bg-cyan-400", glow: "shadow-cyan-400/50", bg: "bg-cyan-500/10", border: "border-cyan-500/25", text: "text-cyan-400", cardBg: "from-cyan-500/[0.08] to-cyan-500/[0.02]", hoverBorder: "hover:border-cyan-400/40" },
};

// Bucket to color mapping
const bucketColorMap: Record<string, string> = {
  work: "amber",
  video: "blue",
  life: "rose",
  boardgame: "cyan",
};

// Buckets config
const buckets = [
  { id: null, label: "All", icon: Hash, color: "text-white/50" },
  { id: "work", label: "Work", icon: Zap, color: "text-amber-400" },
  { id: "video", label: "Video", icon: Film, color: "text-blue-400" },
  { id: "life", label: "Life", icon: Heart, color: "text-rose-400" },
  { id: "boardgame", label: "Game", icon: Gamepad2, color: "text-cyan-400" },
];

// Convert Item to Note for UI
function itemToNote(item: Item): Note {
  const color = bucketColorMap[item.bucket || ""] || "violet";
  return {
    id: item.id,
    title: item.summary || item.body.slice(0, 50) || "Untitled",
    adfContent: item.adf_content || plainTextToADF(item.body),
    bucket: item.bucket || "",
    pinned: item.pinned,
    color,
    updatedAt: new Date(item.updated_at).toLocaleDateString("ja-JP"),
    tags: item.auto_tags || [],
    archived: item.status === "archived",
    subtasks: item.subtasks || [],
  };
}

// ADF Inline Renderer
function ADFInlineRenderer({ nodes, onNoteLinkClick }: { nodes?: Array<{ type: string; text?: string; marks?: Array<{ type: string; attrs?: { href?: string; color?: string } }>; attrs?: { text?: string; shortName?: string; url?: string } }>; onNoteLinkClick?: (title: string) => void }) {
  if (!nodes) return null;
  return (
    <>
      {nodes.map((node, i) => {
        if (node.type === "text") {
          let element: React.ReactNode = node.text;
          if (node.marks) {
            for (const mark of node.marks) {
              if (mark.type === "strong") element = <strong key={`s-${i}`} className="font-bold text-white/80">{element}</strong>;
              if (mark.type === "em") element = <em key={`e-${i}`} className="italic">{element}</em>;
              if (mark.type === "code") element = <code key={`c-${i}`} className="px-1.5 py-0.5 bg-white/[0.08] rounded text-[14px] text-violet-300 font-mono">{element}</code>;
              if (mark.type === "link" && mark.attrs?.href) {
                if (mark.attrs.href.startsWith("note://")) {
                  const noteTitle = mark.attrs.href.replace("note://", "");
                  element = <span key={`n-${i}`} onClick={() => onNoteLinkClick?.(noteTitle)} className="px-1.5 py-0.5 rounded cursor-pointer text-violet-400 bg-violet-500/10 hover:bg-violet-500/20">{element}</span>;
                } else {
                  element = <a key={`l-${i}`} href={mark.attrs.href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{element}</a>;
                }
              }
            }
          }
          return <span key={i}>{element}</span>;
        }
        if (node.type === "hardBreak") return <br key={i} />;
        return null;
      })}
    </>
  );
}

// ADF Block Renderer
function ADFBlockRenderer({ node, onNoteLinkClick, onImageClick }: { node: ADFDocument["content"][0]; onNoteLinkClick?: (title: string) => void; onImageClick?: (url: string) => void }) {
  const nodeType = node.type;

  if (nodeType === "paragraph") {
    return <p className="text-[16px] text-white/55 leading-[1.9]"><ADFInlineRenderer nodes={(node as { content?: Array<{ type: string; text?: string; marks?: Array<{ type: string; attrs?: { href?: string } }> }> }).content} onNoteLinkClick={onNoteLinkClick} /></p>;
  }

  if (nodeType === "heading") {
    const level = (node as { attrs: { level: number } }).attrs.level;
    const className = {
      1: "text-[24px] font-bold text-white/90",
      2: "text-[20px] font-bold text-white/85",
      3: "text-[18px] font-semibold text-white/80",
    }[level] || "text-[18px] font-semibold text-white/80";
    const content = <ADFInlineRenderer nodes={(node as { content?: Array<{ type: string; text?: string }> }).content} onNoteLinkClick={onNoteLinkClick} />;
    if (level === 1) return <h1 className={className}>{content}</h1>;
    if (level === 2) return <h2 className={className}>{content}</h2>;
    return <h3 className={className}>{content}</h3>;
  }

  if (nodeType === "mediaSingle") {
    const media = (node as { content: Array<{ attrs: { url?: string; alt?: string } }> }).content[0];
    if (!media.attrs.url) return <div className="text-white/20 text-[14px] italic py-2">[Image: {media.attrs.alt || "image"}]</div>;
    return (
      <div className="my-4 cursor-pointer" onClick={() => onImageClick?.(media.attrs.url!)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.attrs.url} alt={media.attrs.alt || ""} className="max-w-full max-h-[400px] rounded-xl border border-white/[0.06]" />
      </div>
    );
  }

  if (nodeType === "bulletList") {
    return (
      <ul className="space-y-1">
        {((node as { content: Array<{ content: Array<ADFDocument["content"][0]> }> }).content).map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-white/30">•</span>
            <div className="flex-1">{item.content.map((b, j) => <ADFBlockRenderer key={j} node={b} onNoteLinkClick={onNoteLinkClick} onImageClick={onImageClick} />)}</div>
          </li>
        ))}
      </ul>
    );
  }

  if (nodeType === "codeBlock") {
    return (
      <pre className="p-4 bg-white/[0.04] rounded-lg border border-white/[0.06] overflow-x-auto">
        <code className="text-[14px] text-violet-300 font-mono">{((node as { content?: Array<{ text: string }> }).content || []).map(t => t.text).join("")}</code>
      </pre>
    );
  }

  if (nodeType === "panel") {
    const panelType = (node as { attrs: { panelType: string } }).attrs.panelType;
    const styles: Record<string, string> = {
      info: "bg-blue-500/10 border-blue-500/20",
      warning: "bg-amber-500/10 border-amber-500/20",
      error: "bg-red-500/10 border-red-500/20",
      success: "bg-emerald-500/10 border-emerald-500/20",
    };
    return (
      <div className={cn("p-4 rounded-lg border", styles[panelType] || styles.info)}>
        {((node as { content: Array<ADFDocument["content"][0]> }).content).map((b, i) => <ADFBlockRenderer key={i} node={b} onNoteLinkClick={onNoteLinkClick} onImageClick={onImageClick} />)}
      </div>
    );
  }

  return null;
}

// ADF Renderer
function ADFRenderer({ document, onNoteLinkClick, onImageClick }: { document: ADFDocument; onNoteLinkClick?: (title: string) => void; onImageClick?: (url: string) => void }) {
  return (
    <div className="space-y-4">
      {document.content.map((node, i) => <ADFBlockRenderer key={i} node={node} onNoteLinkClick={onNoteLinkClick} onImageClick={onImageClick} />)}
    </div>
  );
}

export default function PrototypePage() {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState<"image" | "link" | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showArchived, setShowArchived] = useState(false);
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // API hooks
  const { data, isLoading, error } = useItems({ status: showArchived ? "archived" : "active" });
  const updateItem = useUpdateItem();
  const createItem = useCreateItem();
  const archiveItem = useArchiveItem();
  const pinItem = usePinItem();

  // Convert items to notes
  const notes = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map(itemToNote);
  }, [data?.items]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    let filtered = notes;
    if (selectedBucket) {
      filtered = filtered.filter(n => n.bucket === selectedBucket);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) ||
        adfToPlainText(n.adfContent).toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [notes, selectedBucket, searchQuery]);

  // Handle note selection
  const handleSelectNote = useCallback((note: Note) => {
    setSelectedNote(note);
    setEditingTitle(note.title);
    setEditingContent(adfToPlainText(note.adfContent));
    setLocalSubtasks(note.subtasks);

    // Initialize editor
    setTimeout(() => {
      if (editorRef.current) {
        let html = adfToPlainText(note.adfContent);
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full max-h-[300px] rounded-lg border border-white/[0.08] inline-block my-2 cursor-pointer" />');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-400 hover:text-blue-300 underline">$1</a>');
        html = html.replace(/\n/g, "<br>");
        editorRef.current.innerHTML = html;
      }
    }, 0);
  }, []);

  // Auto-save
  const saveChanges = useCallback(async () => {
    if (!selectedNote) return;

    setSaveStatus("saving");
    try {
      const adfContent = plainTextToADF(editingContent);
      await updateItem.mutateAsync({
        id: selectedNote.id,
        body: editingContent,
        summary: editingTitle || null,
        adf_content: adfContent,
        subtasks: localSubtasks,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error");
    }
  }, [selectedNote, editingContent, editingTitle, localSubtasks, updateItem]);

  // Debounced save
  useEffect(() => {
    if (!selectedNote) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveChanges, 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [editingContent, editingTitle, localSubtasks, saveChanges, selectedNote]);

  // Handle close note
  const handleCloseNote = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveChanges();
    }
    setSelectedNote(null);
    setSelection(null);
  }, [saveChanges]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedNote && !lightboxImage) handleCloseNote();
      if (e.key === "Escape" && lightboxImage) setLightboxImage(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNote, lightboxImage, handleCloseNote]);

  // Handle text selection
  const handleTextSelect = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      setSelection(sel.toString().trim());
    } else {
      setSelection(null);
    }
  }, []);

  // Create task from selection
  const handleCreateTask = useCallback(() => {
    if (!selection || !selectedNote) return;
    const newSubtask: Subtask = {
      id: `st-${Date.now()}`,
      text: selection,
      completed: false,
      created_at: new Date().toISOString(),
    };
    setLocalSubtasks(prev => [...prev, newSubtask]);
    setSelection(null);
  }, [selection, selectedNote]);

  // Toggle subtask
  const handleToggleSubtask = useCallback((id: string) => {
    setLocalSubtasks(prev => prev.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();

      // Insert image at cursor
      if (editorRef.current) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = file.name;
        img.className = "max-w-full max-h-[300px] rounded-lg border border-white/[0.08] inline-block my-2 cursor-pointer";
        img.onclick = () => setLightboxImage(url);

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.insertNode(img);
          range.setStartAfter(img);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          editorRef.current.appendChild(img);
        }
        editorRef.current.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } catch (err) {
      console.error("Upload error:", err);
    }
  }, []);

  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageUpload(file);
        return;
      }
    }
  }, [handleImageUpload]);

  // Handle editor input
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    let content = "";
    const processNode = (node: ChildNode) => {
      if (node.nodeType === Node.TEXT_NODE) {
        content += node.textContent;
      } else if (node.nodeName === "IMG") {
        const img = node as HTMLImageElement;
        content += `![${img.alt || "image"}](${img.src})`;
      } else if (node.nodeName === "BR") {
        content += "\n";
      } else if (node.nodeName === "DIV" || node.nodeName === "P") {
        if (content && !content.endsWith("\n")) content += "\n";
        node.childNodes.forEach(processNode);
      } else if (node.nodeName === "A") {
        const a = node as HTMLAnchorElement;
        content += `[${a.textContent || a.href}](${a.href})`;
      } else {
        node.childNodes.forEach(processNode);
      }
    };
    editorRef.current.childNodes.forEach(processNode);
    setEditingContent(content.replace(/^\n/, ""));
  }, []);

  // Handle file select
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [handleImageUpload]);

  // Handle add media from URL
  const handleAddMedia = useCallback(() => {
    if (!mediaUrl || !editorRef.current) return;

    if (showMediaModal === "image") {
      const img = document.createElement("img");
      img.src = mediaUrl;
      img.alt = mediaTitle || "image";
      img.className = "max-w-full max-h-[300px] rounded-lg border border-white/[0.08] inline-block my-2 cursor-pointer";
      img.onclick = () => setLightboxImage(mediaUrl);
      editorRef.current.appendChild(img);
    } else {
      const a = document.createElement("a");
      a.href = mediaUrl;
      a.textContent = mediaTitle || mediaUrl;
      a.target = "_blank";
      a.className = "text-blue-400 hover:text-blue-300 underline";
      editorRef.current.appendChild(a);
    }

    editorRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    setShowMediaModal(null);
    setMediaUrl("");
    setMediaTitle("");
  }, [mediaUrl, mediaTitle, showMediaModal]);

  // Handle archive
  const handleArchiveNote = useCallback(async (id: string) => {
    try {
      await archiveItem.mutateAsync(id);
      if (selectedNote?.id === id) setSelectedNote(null);
    } catch (err) {
      console.error("Archive failed:", err);
    }
  }, [archiveItem, selectedNote]);

  // Handle pin
  const handlePinNote = useCallback(async (id: string, pinned: boolean) => {
    try {
      await pinItem.mutateAsync({ id, pinned });
    } catch (err) {
      console.error("Pin failed:", err);
    }
  }, [pinItem]);

  // Handle create new note
  const handleCreateNote = useCallback(async () => {
    try {
      const newItem = await createItem.mutateAsync({
        body: "New note",
        bucket: (selectedBucket as Bucket) || undefined,
      });
      const note = itemToNote(newItem);
      handleSelectNote(note);
    } catch (err) {
      console.error("Create failed:", err);
    }
  }, [createItem, selectedBucket, handleSelectNote]);

  // Full-screen editor view
  if (selectedNote) {
    const color = colorConfig[selectedNote.color] || colorConfig.violet;

    return (
      <div className="fixed inset-0 bg-[#09090b] z-50">
        <div className={cn("fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-20 pointer-events-none", color.bg)} />

        <div className="h-full flex">
          {/* Sidebar */}
          <aside onClick={handleCloseNote} className="w-72 border-r border-white/[0.04] p-5 hidden lg:flex flex-col bg-black/20 cursor-pointer">
            <button onClick={(e) => { e.stopPropagation(); handleCloseNote(); }} className="flex items-center gap-3 px-4 py-3 -mx-2 mb-6 text-[14px] text-white/50 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back to list</span>
            </button>

            <div className="space-y-6" onClick={e => e.stopPropagation()}>
              {/* Properties */}
              <div>
                <p className="text-[11px] font-medium text-white/30 uppercase tracking-widest mb-3">Properties</p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-white/40">Bucket</span>
                    <span className="text-[13px] text-white/70 capitalize bg-white/[0.04] px-2 py-0.5 rounded">{selectedNote.bucket || "none"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-white/40">Updated</span>
                    <span className="text-[13px] text-white/70">{selectedNote.updatedAt}</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {selectedNote.tags.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-white/30 uppercase tracking-widest mb-3">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNote.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-white/[0.04] text-white/50 text-[11px] rounded-lg">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-medium text-white/30 uppercase tracking-widest">Tasks</p>
                  <span className="text-[10px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded">
                    {localSubtasks.filter(t => !t.completed).length} / {localSubtasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {localSubtasks.filter(t => !t.completed).map(task => (
                    <div key={task.id} className="p-2.5 -mx-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-all group">
                      <div className="flex items-start gap-2.5">
                        <button onClick={() => handleToggleSubtask(task.id)} className="mt-0.5 w-4 h-4 rounded-md border-2 border-white/15 hover:border-violet-400 transition-all flex-shrink-0" />
                        <p className="text-[12px] text-white/70 leading-snug">{task.text}</p>
                      </div>
                    </div>
                  ))}
                  {localSubtasks.filter(t => t.completed).length > 0 && (
                    <div className="pt-2 mt-2 border-t border-white/[0.04]">
                      <p className="text-[9px] text-white/20 mb-1.5">Completed</p>
                      {localSubtasks.filter(t => t.completed).map(task => (
                        <div key={task.id} className="flex items-center gap-2 py-1.5">
                          <button onClick={() => handleToggleSubtask(task.id)} className="w-3.5 h-3.5 rounded bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                            <Check className="w-2 h-2 text-violet-400" strokeWidth={3} />
                          </button>
                          <span className="text-[11px] text-white/25 line-through">{task.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {localSubtasks.length === 0 && <p className="text-[11px] text-white/20 py-3 text-center">Select text to create tasks</p>}
                </div>
              </div>
            </div>

            <div className="flex-1" />
            <p className="text-[10px] text-white/15 text-center py-4">Click to return</p>
          </aside>

          {/* Main editor */}
          <main className="flex-1 flex flex-col min-w-0">
            <header className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <button onClick={handleCloseNote} className="lg:hidden flex items-center gap-2 px-3 py-2 -ml-2 text-[13px] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <div className="hidden lg:flex items-center gap-2 text-[13px] text-white/30">
                  <span className="capitalize">{selectedNote.bucket || "inbox"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-white/60 truncate max-w-[200px]">{editingTitle || "Untitled"}</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all",
                  saveStatus === "saving" && "text-amber-400 bg-amber-500/10",
                  saveStatus === "saved" && "text-emerald-400 bg-emerald-500/10",
                  saveStatus === "error" && "text-red-400 bg-red-500/10",
                  saveStatus === "idle" && "text-white/20"
                )}>
                  {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" />Saving...</>}
                  {saveStatus === "saved" && <><Check className="w-3 h-3" />Saved</>}
                  {saveStatus === "error" && <><X className="w-3 h-3" />Error</>}
                  {saveStatus === "idle" && <><Clock className="w-3 h-3" />Auto-save</>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleArchiveNote(selectedNote.id)} className={cn("p-2 rounded-lg transition-all", selectedNote.archived ? "text-violet-400 bg-violet-500/10" : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]")}>
                  {selectedNote.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </button>
                <button onClick={() => handlePinNote(selectedNote.id, !selectedNote.pinned)} className={cn("p-2 rounded-lg transition-all", selectedNote.pinned ? "text-amber-400 bg-amber-500/10" : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]")}>
                  <Pin className="w-4 h-4" />
                </button>
                <button onClick={handleCloseNote} className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all">
                  <span className="text-[11px]">ESC</span>
                  <X className="w-4 h-4" />
                </button>
                <button onClick={handleCloseNote} className="lg:hidden p-2 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-auto" onClick={e => { if (e.target === e.currentTarget) handleCloseNote(); }}>
              <div className="max-w-2xl mx-auto px-6 lg:px-8 py-12">
                <div className="flex items-center gap-3 mb-6" onClick={e => e.stopPropagation()}>
                  <div className={cn("w-3 h-3 rounded-full shadow-lg", color.dot, color.glow)} />
                  <span className="text-[11px] text-white/30 uppercase tracking-widest font-medium">{selectedNote.bucket || "inbox"}</span>
                </div>

                <input
                  type="text"
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="w-full text-[32px] font-bold bg-transparent outline-none placeholder:text-white/10 text-white/95 leading-tight tracking-tight"
                  placeholder="Untitled"
                />

                <div className="mt-8" onClick={e => e.stopPropagation()}>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-[200px] text-white/80 text-[16px] leading-[1.9] outline-none whitespace-pre-wrap empty:before:content-['Start_writing...'] empty:before:text-white/20"
                    style={{ wordBreak: "break-word" }}
                    onInput={handleEditorInput}
                    onPaste={handlePaste}
                    onMouseUp={handleTextSelect}
                    onKeyUp={handleTextSelect}
                  />
                </div>

                {/* Media toolbar */}
                <div className="sticky bottom-4 mt-8" onClick={e => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-1 p-1.5 bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-xl">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all">
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">Upload</span>
                    </button>
                    <button onClick={() => setShowMediaModal("image")} className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all">
                      <Image className="w-4 h-4" />
                      <span className="hidden sm:inline">URL</span>
                    </button>
                    <button onClick={() => setShowMediaModal("link")} className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all">
                      <Link2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Link</span>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </div>
                </div>

                {/* Inline task section */}
                {localSubtasks.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", color.bg)}>
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-[15px] font-semibold text-white/90">Tasks</h4>
                          <p className="text-[12px] text-white/30">{localSubtasks.filter(t => t.completed).length} / {localSubtasks.length} completed</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {localSubtasks.map(task => (
                        <div key={task.id} className={cn("flex items-center gap-3 p-3 rounded-lg transition-all group", task.completed ? "bg-white/[0.01]" : "bg-white/[0.02] hover:bg-white/[0.04]")}>
                          <button onClick={() => handleToggleSubtask(task.id)} className={cn("w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all", task.completed ? "bg-violet-500/20 border-violet-500/40" : "border-white/20 hover:border-violet-400")}>
                            {task.completed && <Check className="w-3 h-3 text-violet-400" strokeWidth={3} />}
                          </button>
                          <span className={cn("flex-1 text-[14px]", task.completed ? "text-white/30 line-through" : "text-white/70")}>{task.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <footer className="px-6 py-3 border-t border-white/[0.04] flex items-center justify-between bg-[#09090b]/50">
              <div className="flex items-center gap-4 text-[11px] text-white/20">
                <span>{editingContent.length} chars</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>Last saved {selectedNote.updatedAt}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleArchiveNote(selectedNote.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-white/25 hover:text-white/50 hover:bg-white/[0.04] rounded-lg transition-all">
                  <Archive className="w-3.5 h-3.5" />
                  Archive
                </button>
              </div>
            </footer>
          </main>
        </div>

        {/* Selection toolbar */}
        {selection && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full" />
            <div className="relative flex items-center gap-1.5 p-1.5 bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60">
              <button onClick={handleCreateTask} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white text-[13px] font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/25">
                <Check className="w-4 h-4" />
                Create task
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/[0.08] text-[13px] font-medium rounded-xl transition-all">
                <Sparkles className="w-4 h-4" />
                Ask AI
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/[0.08] text-[13px] font-medium rounded-xl transition-all">
                <Calendar className="w-4 h-4" />
                Set due
              </button>
              <div className="w-px h-6 bg-white/[0.08] mx-1" />
              <button onClick={() => setSelection(null)} className="p-2.5 text-white/30 hover:text-white/60 hover:bg-white/[0.06] rounded-xl transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Media modal */}
        {showMediaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowMediaModal(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-[#141417] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h3 className="text-[16px] font-semibold text-white/90 flex items-center gap-2">
                  {showMediaModal === "image" ? <Image className="w-5 h-5 text-violet-400" /> : <Link2 className="w-5 h-5 text-violet-400" />}
                  {showMediaModal === "image" ? "Add Image URL" : "Add Link"}
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[12px] text-white/40 mb-2">URL</label>
                  <input type="url" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder={showMediaModal === "image" ? "https://example.com/image.jpg" : "https://example.com"} className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] focus:border-violet-500/50 rounded-xl text-[14px] text-white/90 placeholder:text-white/20 outline-none" autoFocus />
                </div>
                <div>
                  <label className="block text-[12px] text-white/40 mb-2">Title (optional)</label>
                  <input type="text" value={mediaTitle} onChange={e => setMediaTitle(e.target.value)} placeholder="Description" className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] focus:border-violet-500/50 rounded-xl text-[14px] text-white/90 placeholder:text-white/20 outline-none" />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
                <button onClick={() => setShowMediaModal(null)} className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] rounded-lg">Cancel</button>
                <button onClick={handleAddMedia} disabled={!mediaUrl} className="px-4 py-2 bg-violet-500 hover:bg-violet-400 disabled:bg-white/[0.04] disabled:text-white/20 text-white text-[13px] font-medium rounded-lg">Add</button>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox */}
        {lightboxImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setLightboxImage(null)}>
            <button className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/[0.1] rounded-lg" onClick={() => setLightboxImage(null)}>
              <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxImage} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          </div>
        )}
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-violet-500/30">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-violet-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/[0.04] flex flex-col bg-black/20">
          <div className="p-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-[15px] tracking-tight">Capture & Think</span>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 mb-2">
            {showSearch ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-8 py-2 bg-white/[0.04] border border-white/[0.06] rounded-xl text-[13px] placeholder:text-white/30 outline-none focus:border-violet-500/50"
                  autoFocus
                />
                <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowSearch(true)} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-white/40 hover:text-white/60 hover:bg-white/[0.04] rounded-xl transition-all">
                <Search className="w-4 h-4" />
                <span>Search</span>
                <span className="ml-auto text-[11px] text-white/20">⌘K</span>
              </button>
            )}
          </div>

          {/* Buckets */}
          <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-auto">
            {buckets.map(b => {
              const Icon = b.icon;
              const isActive = selectedBucket === b.id;
              const count = notes.filter(n => b.id === null || n.bucket === b.id).length;
              return (
                <button
                  key={b.id || "all"}
                  onClick={() => setSelectedBucket(b.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all group",
                    isActive ? "bg-white/[0.08] text-white" : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                  )}
                >
                  <Icon className={cn("w-4 h-4", b.color)} />
                  <span className="flex-1 text-left">{b.label}</span>
                  <span className={cn("text-[11px] px-1.5 py-0.5 rounded-md", isActive ? "bg-white/[0.1] text-white/70" : "text-white/30")}>{count}</span>
                </button>
              );
            })}
          </nav>

          {/* Archive toggle */}
          <div className="p-3 border-t border-white/[0.04]">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all",
                showArchived ? "bg-violet-500/10 text-violet-400" : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
              )}
            >
              <Archive className="w-4 h-4" />
              <span>{showArchived ? "Show Active" : "Show Archived"}</span>
            </button>
          </div>

          {/* User */}
          <div className="p-3 border-t border-white/[0.04]">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0">
          <header className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-semibold">{buckets.find(b => b.id === selectedBucket)?.label || "All Notes"}</h1>
              <p className="text-[13px] text-white/40 mt-0.5">{filteredNotes.length} notes</p>
            </div>
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-[13px] font-medium rounded-xl transition-all shadow-lg shadow-violet-500/25"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </header>

          <div className="flex-1 overflow-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-20 text-white/40">Failed to load notes</div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40 mb-4">No notes yet</p>
                <button onClick={handleCreateNote} className="px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-[13px] font-medium rounded-xl transition-all">
                  Create your first note
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map(note => {
                  const color = colorConfig[note.color] || colorConfig.violet;
                  return (
                    <button
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className={cn(
                        "group relative p-4 rounded-2xl border text-left transition-all duration-200",
                        "bg-gradient-to-b", color.cardBg,
                        "border-white/[0.06]", color.hoverBorder
                      )}
                    >
                      {note.pinned && (
                        <div className="absolute top-3 right-3">
                          <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        <div className={cn("w-2 h-2 rounded-full", color.dot)} />
                        <span className="text-[11px] text-white/30 uppercase tracking-wider">{note.bucket || "inbox"}</span>
                      </div>
                      <h3 className="text-[15px] font-medium text-white/90 mb-2 line-clamp-1">{note.title}</h3>
                      <p className="text-[13px] text-white/40 line-clamp-2 leading-relaxed mb-3">
                        {adfToPlainText(note.adfContent).slice(0, 150)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/20">{note.updatedAt}</span>
                        {note.tags.length > 0 && (
                          <div className="flex gap-1">
                            {note.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[10px] text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
