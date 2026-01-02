"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Pin, Loader2, FileText, Plus } from "lucide-react";
import type { Item } from "@/types";

interface Note {
  id: string;
  title: string;
  body: string;
  bucket: string;
  pinned: boolean;
  updatedAt: string;
  tags: string[];
}

const bucketColorMap: Record<string, string> = {
  inbox: "bg-slate-400",
  ideas: "bg-amber-400",
  tasks: "bg-blue-400",
  references: "bg-emerald-400",
  projects: "bg-violet-400",
  "": "bg-violet-400",
};

function itemToNote(item: Item): Note {
  return {
    id: item.id,
    title: item.summary || item.body.slice(0, 50) || "Untitled",
    body: item.body,
    bucket: item.bucket || "",
    pinned: item.pinned,
    updatedAt: new Date(item.updated_at).toLocaleDateString("ja-JP"),
    tags: item.auto_tags || [],
  };
}

interface NotesListProps {
  showArchived: boolean;
  selectedBucket: string | null;
  selectedNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
}

export function NotesList({
  showArchived,
  selectedBucket,
  selectedNoteId,
  onSelectNote,
  onCreateNote
}: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchNotes() {
      setIsLoading(true);
      setError(null);

      try {
        const status = showArchived ? "archived" : "active";
        const params = new URLSearchParams({ status });
        if (selectedBucket) {
          params.set("bucket", selectedBucket);
        }

        const res = await fetch(`/api/items?${params}`);
        if (!res.ok) {
          throw new Error("Failed to fetch notes");
        }

        const data = await res.json();

        if (!cancelled) {
          const notesList = (data.items || []).map(itemToNote);
          setNotes(notesList);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchNotes();

    return () => {
      cancelled = true;
    };
  }, [showArchived, selectedBucket]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          <p className="text-white/40 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-400 mb-2">エラー: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-violet-400 hover:underline text-sm"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-violet-400" />
          </div>
          <div>
            <p className="text-white/60 font-medium">
              {showArchived ? "アーカイブされたノートはありません" : "ノートがありません"}
            </p>
            <p className="text-white/30 text-sm mt-1">
              {showArchived ? "アーカイブにはまだ何もありません" : "新しいノートを作成してみましょう"}
            </p>
          </div>
          {!showArchived && (
            <button
              onClick={onCreateNote}
              className="mt-2 px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4 inline-block mr-1" />
              新規ノート作成
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {notes.map((note) => {
        const dotColor = bucketColorMap[note.bucket] || bucketColorMap[""];
        const isSelected = selectedNoteId === note.id;

        return (
          <button
            key={note.id}
            onClick={() => onSelectNote(note)}
            className={cn(
              "w-full text-left p-3 rounded-xl transition-all duration-200",
              isSelected
                ? "bg-violet-500/15 border border-violet-500/30"
                : "hover:bg-white/[0.04] border border-transparent"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn("w-1 h-10 rounded-full flex-shrink-0 mt-0.5", dotColor)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-[14px] text-white/90 truncate">
                    {note.title}
                  </h3>
                  {note.pinned && (
                    <Pin className="w-3 h-3 text-amber-400 fill-amber-400/30 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[12px] text-white/40 line-clamp-1">
                  {note.body.slice(0, 80)}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-white/25">{note.updatedAt}</span>
                  {note.tags.length > 0 && (
                    <span className="text-[10px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded">
                      {note.tags[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
