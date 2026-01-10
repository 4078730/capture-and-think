import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import type { Item } from "@/types";
import type {
  ListNotesOptions,
  CreateNoteInput,
  UpdateNoteInput,
  CategoryCount,
  NotesResponse,
} from "./types";
import {
  parseMarkdown,
  serializeToMarkdown,
  rawNoteToItem,
  itemToFrontmatter,
  generateFilename,
} from "./markdown";

const NB_DIR = process.env.NB_DIR || path.join(process.cwd(), "data/notes");
const ACTIVE_DIR = path.join(NB_DIR, "home");
const ARCHIVED_DIR = path.join(NB_DIR, "archived");

async function ensureDirectories(): Promise<void> {
  await fs.mkdir(ACTIVE_DIR, { recursive: true });
  await fs.mkdir(ARCHIVED_DIR, { recursive: true });
}

async function getAllFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

async function readNote(filepath: string): Promise<Item | null> {
  try {
    const content = await fs.readFile(filepath, "utf-8");
    const filename = path.basename(filepath);
    const raw = parseMarkdown(content, filename, filepath);
    return rawNoteToItem(raw);
  } catch {
    return null;
  }
}

export async function list(options: ListNotesOptions = {}): Promise<NotesResponse> {
  await ensureDirectories();

  const dir = options.status === "archived" ? ARCHIVED_DIR : ACTIVE_DIR;
  const files = await getAllFiles(dir);

  let items: Item[] = [];
  for (const filepath of files) {
    const item = await readNote(filepath);
    if (item) items.push(item);
  }

  if (options.bucket) {
    items = items.filter((i) => i.bucket === options.bucket);
  }
  if (options.category) {
    items = items.filter((i) => i.category === options.category);
  }
  if (options.pinned !== undefined) {
    items = items.filter((i) => i.pinned === options.pinned);
  }
  if (options.q) {
    const q = options.q.toLowerCase();
    items = items.filter(
      (i) =>
        i.body.toLowerCase().includes(q) ||
        i.summary?.toLowerCase().includes(q) ||
        i.memo?.toLowerCase().includes(q)
    );
  }

  items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const total = items.length;
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  items = items.slice(offset, offset + limit);

  return { items, total, limit, offset };
}

export async function get(id: string): Promise<Item | null> {
  await ensureDirectories();

  for (const dir of [ACTIVE_DIR, ARCHIVED_DIR]) {
    const files = await getAllFiles(dir);
    for (const filepath of files) {
      const item = await readNote(filepath);
      if (item?.id === id) return item;
    }
  }
  return null;
}

async function findFilePath(id: string): Promise<string | null> {
  for (const dir of [ACTIVE_DIR, ARCHIVED_DIR]) {
    const files = await getAllFiles(dir);
    for (const filepath of files) {
      const content = await fs.readFile(filepath, "utf-8");
      const raw = parseMarkdown(content, path.basename(filepath), filepath);
      if (raw.frontmatter.id === id) return filepath;
    }
  }
  return null;
}

export async function create(input: CreateNoteInput): Promise<Item> {
  await ensureDirectories();

  const id = uuidv4();
  const now = new Date().toISOString();

  const frontmatter = itemToFrontmatter({
    id,
    bucket: input.bucket || null,
    pinned: input.pinned || false,
    source: input.source || "pwa",
    memo: input.memo || null,
    due_date: input.due_date || null,
    created_at: now,
    updated_at: now,
    status: "active",
    kind: "unknown",
    triage_state: "pending",
    auto_tags: [],
    subtasks: [],
    confidence: 0,
  });

  const filename = generateFilename(id, now);
  const filepath = path.join(ACTIVE_DIR, filename);
  const content = serializeToMarkdown(frontmatter, input.body);

  await fs.writeFile(filepath, content, "utf-8");

  return (await get(id))!;
}

export async function update(id: string, data: UpdateNoteInput): Promise<Item | null> {
  const filepath = await findFilePath(id);
  if (!filepath) return null;

  const existingContent = await fs.readFile(filepath, "utf-8");
  const raw = parseMarkdown(existingContent, path.basename(filepath), filepath);
  const existingItem = rawNoteToItem(raw);

  const updatedItem: Item = {
    ...existingItem,
    ...data,
    body: data.body ?? existingItem.body,
    updated_at: new Date().toISOString(),
  };

  const frontmatter = itemToFrontmatter(updatedItem);
  const content = serializeToMarkdown(frontmatter, updatedItem.body);

  await fs.writeFile(filepath, content, "utf-8");

  return updatedItem;
}

export async function remove(id: string): Promise<boolean> {
  const filepath = await findFilePath(id);
  if (!filepath) return false;

  await fs.unlink(filepath);
  return true;
}

export async function pin(id: string): Promise<Item | null> {
  return update(id, { pinned: true });
}

export async function unpin(id: string): Promise<Item | null> {
  return update(id, { pinned: false });
}

export async function archive(id: string): Promise<Item | null> {
  const filepath = await findFilePath(id);
  if (!filepath) return null;

  const item = await update(id, { status: "archived" } as UpdateNoteInput);
  if (!item) return null;

  const filename = path.basename(filepath);
  const newPath = path.join(ARCHIVED_DIR, filename);

  const content = await fs.readFile(filepath, "utf-8");
  await fs.writeFile(newPath, content, "utf-8");
  await fs.unlink(filepath);

  return { ...item, status: "archived" };
}

export async function unarchive(id: string): Promise<Item | null> {
  const filepath = await findFilePath(id);
  if (!filepath) return null;

  const item = await update(id, { status: "active" } as UpdateNoteInput);
  if (!item) return null;

  const filename = path.basename(filepath);
  const newPath = path.join(ACTIVE_DIR, filename);

  const content = await fs.readFile(filepath, "utf-8");
  await fs.writeFile(newPath, content, "utf-8");
  await fs.unlink(filepath);

  return { ...item, status: "active" };
}

export async function getCategories(bucket?: string): Promise<CategoryCount[]> {
  const { items } = await list({ status: "active", bucket: bucket as any });

  const counts: Record<string, number> = {};
  for (const item of items) {
    if (item.category) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function search(query: string): Promise<Item[]> {
  const { items } = await list({ q: query, limit: 100 });
  return items;
}

export async function getArchiveCandidates(daysOld: number = 30): Promise<NotesResponse> {
  await ensureDirectories();

  const files = await getAllFiles(ACTIVE_DIR);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  let items: Item[] = [];
  for (const filepath of files) {
    const item = await readNote(filepath);
    if (item && !item.pinned && new Date(item.created_at) < cutoffDate) {
      items.push(item);
    }
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { items, total: items.length, limit: items.length, offset: 0 };
}

export async function getAwaitingApproval(options: { limit?: number; offset?: number } = {}): Promise<NotesResponse> {
  await ensureDirectories();

  const files = await getAllFiles(ACTIVE_DIR);
  let items: Item[] = [];
  
  for (const filepath of files) {
    const item = await readNote(filepath);
    if (item && item.triage_state === "awaiting_approval") {
      items.push(item);
    }
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = items.length;
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  items = items.slice(offset, offset + limit);

  return { items, total, limit, offset };
}

export async function bulkArchive(ids: string[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const id of ids) {
    const result = await archive(id);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

export const nbAdapter = {
  list,
  get,
  create,
  update,
  remove,
  pin,
  unpin,
  archive,
  unarchive,
  getCategories,
  search,
  getArchiveCandidates,
  getAwaitingApproval,
  bulkArchive,
};
