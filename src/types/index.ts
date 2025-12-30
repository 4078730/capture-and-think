import type { ADFDocument } from "@/lib/adf";

export type Bucket = "work" | "video" | "life" | "boardgame";
export type Kind = "idea" | "task" | "note" | "reference" | "unknown";
export type Status = "active" | "archived";
export type TriageState = "pending" | "awaiting_approval" | "done" | "failed";
export type Source = "pwa" | "widget" | "claude" | "chatgpt" | "browser" | "mcp";

// Subtask for checklist items
export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
}

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
  // New fields
  memo: string | null;
  subtasks: Subtask[];
  due_date: string | null;
  // AI suggestions (before approval)
  ai_suggested_bucket: Bucket | null;
  ai_suggested_category: string | null;
  ai_suggested_kind: Kind | null;
  ai_suggested_summary: string | null;
  ai_suggested_tags: string[];
  ai_confidence: number | null;
  // Calendar sync
  google_calendar_event_id: string | null;
  // Rich text content (ADF format)
  adf_content: ADFDocument | null;
}

export interface CreateItemInput {
  body: string;
  bucket?: Bucket;
  pinned?: boolean;
  source?: Source;
  memo?: string;
  due_date?: string;
  adf_content?: ADFDocument;
}

export interface UpdateItemInput {
  body?: string;
  bucket?: Bucket | null;
  pinned?: boolean;
  memo?: string;
  due_date?: string | null;
  subtasks?: Subtask[];
  adf_content?: ADFDocument | null;
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
  // Enhanced fields
  enhanced_title?: string;
  enhanced_body?: string;
  extracted_references?: string[];
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

// API Key for MCP authentication
export interface ApiKey {
  id: string;
  user_id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

// User settings
export interface UserSettings {
  id: string;
  user_id: string;
  google_calendar_enabled: boolean;
  google_calendar_id: string | null;
  created_at: string;
  updated_at: string;
}

// Due items grouped by urgency
export interface DueItemsResponse {
  overdue: Item[];
  today: Item[];
  upcoming: Item[];
}
