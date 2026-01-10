#!/usr/bin/env npx tsx
/**
 * Capture & Think MCP Server
 * 
 * Provides MCP tools for interacting with notes and tasks.
 * Run with: npx tsx mcp-server/index.ts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import matter from "gray-matter";

const NB_DIR = process.env.NB_DIR || path.join(process.cwd(), "data/notes");
const ACTIVE_DIR = path.join(NB_DIR, "home");
const ARCHIVED_DIR = path.join(NB_DIR, "archived");

type Bucket = "management" | "rfa" | "cxc" | "paper" | "video" | "life" | "game";
type Status = "active" | "archived";
type Source = "pwa" | "widget" | "claude" | "chatgpt" | "browser" | "mcp";

interface Item {
  id: string;
  body: string;
  bucket: Bucket | null;
  pinned: boolean;
  status: Status;
  category: string | null;
  summary: string | null;
  source: Source | null;
  created_at: string;
  updated_at: string;
  memo: string | null;
  due_date: string | null;
}

interface ExtractedTask {
  id: string;
  text: string;
  completed: boolean;
  lineIndex: number;
  itemId: string;
  itemTitle: string;
  itemBucket: Bucket | null;
}

interface TasksByBucket {
  bucket: Bucket | null;
  bucketLabel: string;
  tasks: ExtractedTask[];
  completedCount: number;
  totalCount: number;
}

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

function parseMarkdownFile(content: string, filename: string): Item | null {
  try {
    const { data, content: body } = matter(content);
    return {
      id: data.id || filename.replace(".md", ""),
      body: body.trim(),
      bucket: data.bucket || null,
      pinned: data.pinned || false,
      status: data.status || "active",
      category: data.category || null,
      summary: data.summary || null,
      source: data.source || null,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
      memo: data.memo || null,
      due_date: data.due_date || null,
    };
  } catch {
    return null;
  }
}

async function readNote(filepath: string): Promise<Item | null> {
  try {
    const content = await fs.readFile(filepath, "utf-8");
    const filename = path.basename(filepath);
    return parseMarkdownFile(content, filename);
  } catch {
    return null;
  }
}

function generateFilename(id: string, date: string): string {
  const d = new Date(date);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  return `${dateStr}_${id.slice(0, 8)}.md`;
}

function serializeToMarkdown(item: Partial<Item>, body: string): string {
  const frontmatter: Record<string, unknown> = {
    id: item.id,
    bucket: item.bucket,
    pinned: item.pinned ?? false,
    status: item.status ?? "active",
    source: item.source ?? "mcp",
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
  
  if (item.category) frontmatter.category = item.category;
  if (item.summary) frontmatter.summary = item.summary;
  if (item.memo) frontmatter.memo = item.memo;
  if (item.due_date) frontmatter.due_date = item.due_date;

  return matter.stringify(body, frontmatter);
}

async function listNotes(options: {
  bucket?: string;
  status?: string;
  limit?: number;
  q?: string;
}): Promise<{ items: Item[]; total: number }> {
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
  const limit = options.limit || 50;
  items = items.slice(0, limit);

  return { items, total };
}

async function getNote(id: string): Promise<Item | null> {
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
      const { data } = matter(content);
      if (data.id === id) return filepath;
    }
  }
  return null;
}

async function createNote(input: {
  body: string;
  bucket?: string;
  memo?: string;
  due_date?: string;
}): Promise<Item> {
  await ensureDirectories();

  const id = uuidv4();
  const now = new Date().toISOString();

  const item: Partial<Item> = {
    id,
    bucket: (input.bucket as Bucket) || null,
    pinned: false,
    source: "mcp",
    memo: input.memo || null,
    due_date: input.due_date || null,
    created_at: now,
    updated_at: now,
    status: "active",
  };

  const filename = generateFilename(id, now);
  const filepath = path.join(ACTIVE_DIR, filename);
  const content = serializeToMarkdown(item, input.body);

  await fs.writeFile(filepath, content, "utf-8");

  return (await getNote(id))!;
}

async function updateNote(
  id: string,
  data: { body?: string; bucket?: string; memo?: string; due_date?: string }
): Promise<Item | null> {
  const filepath = await findFilePath(id);
  if (!filepath) return null;

  const existingContent = await fs.readFile(filepath, "utf-8");
  const existingItem = parseMarkdownFile(existingContent, path.basename(filepath));
  if (!existingItem) return null;

  const updatedItem: Partial<Item> = {
    ...existingItem,
    body: data.body ?? existingItem.body,
    bucket: (data.bucket as Bucket) ?? existingItem.bucket,
    memo: data.memo ?? existingItem.memo,
    due_date: data.due_date ?? existingItem.due_date,
    updated_at: new Date().toISOString(),
  };

  const content = serializeToMarkdown(updatedItem, updatedItem.body || "");
  await fs.writeFile(filepath, content, "utf-8");

  return (await getNote(id))!;
}

async function searchNotes(query: string, limit?: number): Promise<Item[]> {
  const { items } = await listNotes({ q: query, limit: limit || 20 });
  return items;
}

const TASK_REGEX = /^(\s*)[-*+]\s*\[([ xX])\]\s*(.+)$/;

const BUCKET_LABELS: Record<string, string> = {
  management: "Management",
  rfa: "RFA",
  cxc: "CXC",
  paper: "Paper",
  video: "Video",
  life: "Life",
  game: "Game",
};

const BUCKET_ORDER: (Bucket | "uncategorized")[] = [
  "management",
  "rfa",
  "cxc",
  "paper",
  "video",
  "life",
  "game",
  "uncategorized",
];

function extractTasksFromItem(item: Item): ExtractedTask[] {
  const title = item.summary || item.body.split("\n")[0]?.substring(0, 50) || "Untitled";
  const lines = item.body.split("\n");
  const tasks: ExtractedTask[] = [];

  lines.forEach((line, index) => {
    const match = line.match(TASK_REGEX);
    if (match) {
      const [, , checkMark, text] = match;
      tasks.push({
        id: `${item.id}-${index}`,
        text: text.trim(),
        completed: checkMark.toLowerCase() === "x",
        lineIndex: index,
        itemId: item.id,
        itemTitle: title,
        itemBucket: item.bucket,
      });
    }
  });

  return tasks;
}

async function listTasks(): Promise<TasksByBucket[]> {
  const { items } = await listNotes({ status: "active", limit: 1000 });

  const allTasks: ExtractedTask[] = [];
  for (const item of items) {
    allTasks.push(...extractTasksFromItem(item));
  }

  const grouped: Record<string, ExtractedTask[]> = {};
  for (const task of allTasks) {
    const key = task.itemBucket || "uncategorized";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(task);
  }

  const result: TasksByBucket[] = [];
  for (const bucket of BUCKET_ORDER) {
    const tasks = grouped[bucket];
    if (tasks && tasks.length > 0) {
      result.push({
        bucket: bucket === "uncategorized" ? null : (bucket as Bucket),
        bucketLabel: bucket === "uncategorized" ? "Uncategorized" : BUCKET_LABELS[bucket] || bucket,
        tasks,
        completedCount: tasks.filter((t) => t.completed).length,
        totalCount: tasks.length,
      });
    }
  }

  return result;
}

function toggleTaskInBody(body: string, lineIndex: number): string {
  const lines = body.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return body;

  const line = lines[lineIndex];
  const match = line.match(TASK_REGEX);
  if (!match) return body;

  const isCompleted = match[2].toLowerCase() === "x";
  const newCheckMark = isCompleted ? " " : "x";
  lines[lineIndex] = line.replace(/\[([ xX])\]/, `[${newCheckMark}]`);

  return lines.join("\n");
}

async function toggleTask(itemId: string, lineIndex: number): Promise<{ success: boolean; completed?: boolean }> {
  const item = await getNote(itemId);
  if (!item) return { success: false };

  const newBody = toggleTaskInBody(item.body, lineIndex);
  if (newBody === item.body) return { success: false };

  await updateNote(itemId, { body: newBody });

  const lines = newBody.split("\n");
  const match = lines[lineIndex]?.match(TASK_REGEX);
  const completed = match ? match[2].toLowerCase() === "x" : false;

  return { success: true, completed };
}

const server = new McpServer({
  name: "capture-and-think",
  version: "1.0.0",
});

server.tool(
  "create_note",
  {
    body: z.string().describe("The note content (Markdown supported)"),
    bucket: z.enum(["management", "rfa", "cxc", "paper", "video", "life", "game"]).optional().describe("Category bucket"),
    memo: z.string().optional().describe("Additional memo/context"),
    due_date: z.string().optional().describe("Due date (ISO 8601 format)"),
  },
  async ({ body, bucket, memo, due_date }) => {
    const item = await createNote({ body, bucket, memo, due_date });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, note: item }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "list_notes",
  {
    bucket: z.enum(["management", "rfa", "cxc", "paper", "video", "life", "game"]).optional().describe("Filter by bucket"),
    status: z.enum(["active", "archived"]).optional().describe("Filter by status (default: active)"),
    limit: z.number().optional().describe("Maximum number of notes to return (default: 50)"),
    q: z.string().optional().describe("Search query"),
  },
  async ({ bucket, status, limit, q }) => {
    const result = await listNotes({ bucket, status, limit, q });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_note",
  {
    id: z.string().describe("Note ID"),
  },
  async ({ id }) => {
    const item = await getNote(id);
    if (!item) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Note not found" }) }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(item, null, 2) }],
    };
  }
);

server.tool(
  "update_note",
  {
    id: z.string().describe("Note ID"),
    body: z.string().optional().describe("New content"),
    bucket: z.enum(["management", "rfa", "cxc", "paper", "video", "life", "game"]).optional().describe("New bucket"),
    memo: z.string().optional().describe("New memo"),
    due_date: z.string().optional().describe("New due date"),
  },
  async ({ id, body, bucket, memo, due_date }) => {
    const item = await updateNote(id, { body, bucket, memo, due_date });
    if (!item) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Note not found" }) }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, note: item }, null, 2) }],
    };
  }
);

server.tool(
  "search_notes",
  {
    query: z.string().describe("Search query"),
    limit: z.number().optional().describe("Maximum results (default: 20)"),
  },
  async ({ query, limit }) => {
    const items = await searchNotes(query, limit);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ items, total: items.length }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "list_tasks",
  {},
  async () => {
    const tasksByBucket = await listTasks();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(tasksByBucket, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "toggle_task",
  {
    itemId: z.string().describe("ID of the note containing the task"),
    lineIndex: z.number().describe("Line index of the task in the note body"),
  },
  async ({ itemId, lineIndex }) => {
    const result = await toggleTask(itemId, lineIndex);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Capture & Think MCP Server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
