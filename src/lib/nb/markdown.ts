import matter from "gray-matter";
import type { Item } from "@/types";
import type { NoteFrontmatter, RawNote } from "./types";

const DEFAULT_FRONTMATTER: NoteFrontmatter = {
  id: "",
  bucket: null,
  pinned: false,
  status: "active",
  kind: "unknown",
  category: null,
  summary: null,
  auto_tags: [],
  confidence: 0,
  triage_state: "pending",
  triaged_at: null,
  source: null,
  memo: null,
  due_date: null,
  subtasks: [],
  ai_suggested_bucket: null,
  ai_suggested_category: null,
  ai_suggested_kind: null,
  ai_suggested_summary: null,
  ai_suggested_tags: [],
  ai_confidence: null,
  google_calendar_event_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function parseMarkdown(content: string, filename: string, filepath: string): RawNote {
  const { data, content: body } = matter(content);
  return {
    filename,
    filepath,
    frontmatter: data as Partial<NoteFrontmatter>,
    body: body.trim(),
  };
}

export function serializeToMarkdown(frontmatter: Partial<NoteFrontmatter>, body: string): string {
  const cleanFrontmatter = Object.fromEntries(
    Object.entries(frontmatter).filter(([_, v]) => v !== undefined)
  );
  return matter.stringify(body, cleanFrontmatter);
}

export function rawNoteToItem(raw: RawNote): Item {
  const fm = { ...DEFAULT_FRONTMATTER, ...raw.frontmatter };
  
  return {
    id: fm.id,
    body: raw.body,
    bucket: fm.bucket,
    pinned: fm.pinned,
    status: fm.status,
    category: fm.category,
    kind: fm.kind,
    summary: fm.summary,
    auto_tags: fm.auto_tags || [],
    confidence: fm.confidence,
    triage_state: fm.triage_state,
    triaged_at: fm.triaged_at,
    source: fm.source,
    created_at: fm.created_at,
    updated_at: fm.updated_at,
    memo: fm.memo,
    subtasks: fm.subtasks || [],
    due_date: fm.due_date,
    ai_suggested_bucket: fm.ai_suggested_bucket,
    ai_suggested_category: fm.ai_suggested_category,
    ai_suggested_kind: fm.ai_suggested_kind,
    ai_suggested_summary: fm.ai_suggested_summary,
    ai_suggested_tags: fm.ai_suggested_tags || [],
    ai_confidence: fm.ai_confidence,
    google_calendar_event_id: fm.google_calendar_event_id,
    adf_content: null,
  };
}

export function itemToFrontmatter(item: Partial<Item> & { id: string }): NoteFrontmatter {
  return {
    id: item.id,
    bucket: item.bucket ?? null,
    pinned: item.pinned ?? false,
    status: item.status ?? "active",
    kind: item.kind ?? "unknown",
    category: item.category ?? null,
    summary: item.summary ?? null,
    auto_tags: item.auto_tags ?? [],
    confidence: item.confidence ?? 0,
    triage_state: item.triage_state ?? "pending",
    triaged_at: item.triaged_at ?? null,
    source: item.source ?? null,
    memo: item.memo ?? null,
    due_date: item.due_date ?? null,
    subtasks: item.subtasks ?? [],
    ai_suggested_bucket: item.ai_suggested_bucket ?? null,
    ai_suggested_category: item.ai_suggested_category ?? null,
    ai_suggested_kind: item.ai_suggested_kind ?? null,
    ai_suggested_summary: item.ai_suggested_summary ?? null,
    ai_suggested_tags: item.ai_suggested_tags ?? [],
    ai_confidence: item.ai_confidence ?? null,
    google_calendar_event_id: item.google_calendar_event_id ?? null,
    created_at: item.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function generateFilename(id: string, createdAt: string): string {
  const date = new Date(createdAt).toISOString().split("T")[0];
  return `${date}_${id.slice(0, 8)}.md`;
}
