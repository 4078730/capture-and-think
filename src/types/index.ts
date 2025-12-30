export type Bucket = "work" | "video" | "life" | "boardgame";
export type Kind = "idea" | "task" | "note" | "reference" | "unknown";
export type Status = "active" | "archived";
export type TriageState = "pending" | "done" | "failed";
export type Source = "pwa" | "widget" | "claude" | "chatgpt" | "browser";

export interface Item {
  id: string;
  body: string;
  bucket: Bucket | null;
  pinned: boolean;
  status: Status;
  category: string | null;
  kind: Kind;
  summary: string | null;
  auto_tags: string[];
  confidence: number;
  triage_state: TriageState;
  triaged_at: string | null;
  source: Source | null;
  created_at: string;
  updated_at: string;
}

export interface CreateItemInput {
  body: string;
  bucket?: Bucket;
  pinned?: boolean;
  source?: Source;
}

export interface UpdateItemInput {
  body?: string;
  bucket?: Bucket;
  pinned?: boolean;
}

export interface ParsedInput {
  body: string;
  bucket?: Bucket;
  pinned: boolean;
}

export interface TriageResult {
  bucket: Bucket;
  category: string;
  kind: Kind;
  summary: string;
  auto_tags: string[];
  confidence: number;
}

export interface AskResponse {
  answer: string;
  sources: Array<{
    id: string;
    body: string;
    summary: string | null;
    relevance: number;
  }>;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface ItemsResponse {
  items: Item[];
  total: number;
  limit: number;
  offset: number;
}
