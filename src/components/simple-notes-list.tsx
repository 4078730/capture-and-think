"use client";

import useSWR from "swr";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  body: string;
  summary: string | null;
  bucket: string | null;
  pinned: boolean;
  updated_at: string;
  auto_tags: string[] | null;
}

interface Note {
  id: string;
  title: string;
  body: string;
  bucket: string;
  pinned: boolean;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

function itemToNote(item: Item): Note {
  return {
    id: item.id,
    title: item.summary || item.body.slice(0, 50) || "Untitled",
    body: item.body,
    bucket: item.bucket || "",
    pinned: item.pinned,
    updatedAt: new Date(item.updated_at).toLocaleDateString("ja-JP"),
  };
}

interface SimpleNotesListProps {
  showArchived: boolean;
  selectedNoteId: string | null;
  onSelectNote: (note: Note) => void;
}

export function SimpleNotesList({ showArchived, selectedNoteId, onSelectNote }: SimpleNotesListProps) {
  const status = showArchived ? "archived" : "active";
  const { data, error, isLoading } = useSWR(`/api/items?status=${status}`, fetcher, {
    revalidateOnFocus: false,
  });

  const notes: Note[] = data?.items?.map(itemToNote) || [];

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {isLoading && (
        <div className="text-center py-8 text-white/50">
          <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-2" />
          Loading...
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-red-400">
          Error loading notes
        </div>
      )}

      {!isLoading && !error && notes.length === 0 && (
        <div className="text-center py-8 text-white/50">
          No notes
        </div>
      )}

      {!isLoading && !error && notes.length > 0 && (
        <div className="space-y-2">
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => onSelectNote(note)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors",
                selectedNoteId === note.id
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-white/80 hover:bg-zinc-700"
              )}
            >
              <div className="font-medium text-sm truncate">{note.title}</div>
              <div className="text-xs opacity-60 mt-1">{note.updatedAt}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export type { Note };
