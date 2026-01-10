import type { Bucket, Kind, Status, TriageState, Source, Subtask } from "@/types";

export interface NoteFrontmatter {
  id: string;
  bucket: Bucket | null;
  pinned: boolean;
  status: Status;
  kind: Kind;
  category: string | null;
  summary: string | null;
  auto_tags: string[];
  confidence: number;
  triage_state: TriageState;
  triaged_at: string | null;
  source: Source | null;
  memo: string | null;
  due_date: string | null;
  subtasks: Subtask[];
  ai_suggested_bucket: Bucket | null;
  ai_suggested_category: string | null;
  ai_suggested_kind: Kind | null;
  ai_suggested_summary: string | null;
  ai_suggested_tags: string[];
  ai_confidence: number | null;
  google_calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawNote {
  filename: string;
  filepath: string;
  frontmatter: Partial<NoteFrontmatter>;
  body: string;
}

export interface ListNotesOptions {
  status?: Status;
  bucket?: Bucket | null;
  category?: string | null;
  pinned?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface CreateNoteInput {
  body: string;
  bucket?: Bucket;
  pinned?: boolean;
  source?: Source;
  memo?: string;
  due_date?: string;
}

export interface UpdateNoteInput {
  body?: string;
  bucket?: Bucket | null;
  pinned?: boolean;
  memo?: string;
  due_date?: string | null;
  subtasks?: Subtask[];
  summary?: string | null;
  category?: string | null;
  kind?: Kind;
  auto_tags?: string[];
  confidence?: number;
  triage_state?: TriageState;
  triaged_at?: string | null;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface NotesResponse {
  items: import("@/types").Item[];
  total: number;
  limit: number;
  offset: number;
}
