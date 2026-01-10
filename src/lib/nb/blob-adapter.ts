import { put, list as blobList, del, head } from "@vercel/blob";
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

const BLOB_PREFIX = "notes/";

function getPath(status: "active" | "archived", filename: string): string {
  return `${BLOB_PREFIX}${status}/${filename}`;
}

async function getAllBlobs(status: "active" | "archived"): Promise<{ url: string; pathname: string }[]> {
  try {
    const prefix = `${BLOB_PREFIX}${status}/`;
    const result = await blobList({ prefix });
    return result.blobs.filter((b) => b.pathname.endsWith(".md"));
  } catch (error) {
    console.error("Error listing blobs:", error);
    return [];
  }
}

async function readNote(blob: { url: string; pathname: string }): Promise<Item | null> {
  try {
    const response = await fetch(blob.url);
    const content = await response.text();
    const filename = blob.pathname.split("/").pop() || "";
    const raw = parseMarkdown(content, filename, blob.pathname);
    return rawNoteToItem(raw);
  } catch (error) {
    console.error("Error reading note:", error);
    return null;
  }
}

export async function list(options: ListNotesOptions = {}): Promise<NotesResponse> {
  const status = options.status || "active";
  const blobs = await getAllBlobs(status);

  let items: Item[] = [];
  for (const blob of blobs) {
    const item = await readNote(blob);
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
  for (const status of ["active", "archived"] as const) {
    const blobs = await getAllBlobs(status);
    for (const blob of blobs) {
      const item = await readNote(blob);
      if (item?.id === id) return item;
    }
  }
  return null;
}

async function findBlobPath(id: string): Promise<{ url: string; pathname: string; status: "active" | "archived" } | null> {
  for (const status of ["active", "archived"] as const) {
    const blobs = await getAllBlobs(status);
    for (const blob of blobs) {
      const item = await readNote(blob);
      if (item?.id === id) {
        return { ...blob, status };
      }
    }
  }
  return null;
}

export async function create(input: CreateNoteInput): Promise<Item> {
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
  const pathname = getPath("active", filename);
  const content = serializeToMarkdown(frontmatter, input.body);

  await put(pathname, content, {
    access: "public",
    contentType: "text/markdown",
  });

  return (await get(id))!;
}

export async function update(id: string, data: UpdateNoteInput): Promise<Item | null> {
  const blobInfo = await findBlobPath(id);
  if (!blobInfo) return null;

  const response = await fetch(blobInfo.url);
  const existingContent = await response.text();
  const filename = blobInfo.pathname.split("/").pop() || "";
  const raw = parseMarkdown(existingContent, filename, blobInfo.pathname);
  const existingItem = rawNoteToItem(raw);

  const updatedItem: Item = {
    ...existingItem,
    ...data,
    body: data.body ?? existingItem.body,
    updated_at: new Date().toISOString(),
  };

  const frontmatter = itemToFrontmatter(updatedItem);
  const content = serializeToMarkdown(frontmatter, updatedItem.body);

  await del(blobInfo.url);
  await put(blobInfo.pathname, content, {
    access: "public",
    contentType: "text/markdown",
  });

  return updatedItem;
}

export async function remove(id: string): Promise<boolean> {
  const blobInfo = await findBlobPath(id);
  if (!blobInfo) return false;

  await del(blobInfo.url);
  return true;
}

export async function pin(id: string): Promise<Item | null> {
  return update(id, { pinned: true });
}

export async function unpin(id: string): Promise<Item | null> {
  return update(id, { pinned: false });
}

export async function archive(id: string): Promise<Item | null> {
  const blobInfo = await findBlobPath(id);
  if (!blobInfo) return null;

  const response = await fetch(blobInfo.url);
  const content = await response.text();
  const filename = blobInfo.pathname.split("/").pop() || "";
  const raw = parseMarkdown(content, filename, blobInfo.pathname);
  const existingItem = rawNoteToItem(raw);

  const updatedItem: Item = {
    ...existingItem,
    status: "archived",
    updated_at: new Date().toISOString(),
  };

  const frontmatter = itemToFrontmatter(updatedItem);
  const newContent = serializeToMarkdown(frontmatter, updatedItem.body);

  const newPathname = getPath("archived", filename);

  await del(blobInfo.url);
  await put(newPathname, newContent, {
    access: "public",
    contentType: "text/markdown",
  });

  return updatedItem;
}

export async function unarchive(id: string): Promise<Item | null> {
  const blobInfo = await findBlobPath(id);
  if (!blobInfo) return null;

  const response = await fetch(blobInfo.url);
  const content = await response.text();
  const filename = blobInfo.pathname.split("/").pop() || "";
  const raw = parseMarkdown(content, filename, blobInfo.pathname);
  const existingItem = rawNoteToItem(raw);

  const updatedItem: Item = {
    ...existingItem,
    status: "active",
    updated_at: new Date().toISOString(),
  };

  const frontmatter = itemToFrontmatter(updatedItem);
  const newContent = serializeToMarkdown(frontmatter, updatedItem.body);

  const newPathname = getPath("active", filename);

  await del(blobInfo.url);
  await put(newPathname, newContent, {
    access: "public",
    contentType: "text/markdown",
  });

  return updatedItem;
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
  const blobs = await getAllBlobs("active");
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  let items: Item[] = [];
  for (const blob of blobs) {
    const item = await readNote(blob);
    if (item && !item.pinned && new Date(item.created_at) < cutoffDate) {
      items.push(item);
    }
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { items, total: items.length, limit: items.length, offset: 0 };
}

export async function getAwaitingApproval(options: { limit?: number; offset?: number } = {}): Promise<NotesResponse> {
  const blobs = await getAllBlobs("active");
  let items: Item[] = [];

  for (const blob of blobs) {
    const item = await readNote(blob);
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

export const blobAdapter = {
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
