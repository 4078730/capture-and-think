import type { Item, Bucket } from "@/types";

export interface ExtractedTask {
  id: string;
  text: string;
  completed: boolean;
  lineIndex: number;
  itemId: string;
  itemTitle: string;
  itemBucket: Bucket | null;
  itemCreatedAt: string;
}

export interface TasksByBucket {
  bucket: Bucket | null;
  bucketLabel: string;
  tasks: ExtractedTask[];
  completedCount: number;
  totalCount: number;
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

export function extractTasksFromBody(
  body: string,
  itemId: string,
  itemTitle: string,
  itemBucket: Bucket | null,
  itemCreatedAt: string
): ExtractedTask[] {
  const lines = body.split("\n");
  const tasks: ExtractedTask[] = [];

  lines.forEach((line, index) => {
    const match = line.match(TASK_REGEX);
    if (match) {
      const [, , checkMark, text] = match;
      tasks.push({
        id: `${itemId}-${index}`,
        text: text.trim(),
        completed: checkMark.toLowerCase() === "x",
        lineIndex: index,
        itemId,
        itemTitle,
        itemBucket,
        itemCreatedAt,
      });
    }
  });

  return tasks;
}

export function extractTasksFromItem(item: Item): ExtractedTask[] {
  const title = item.summary || item.body.split("\n")[0]?.substring(0, 50) || "Untitled";
  return extractTasksFromBody(item.body, item.id, title, item.bucket, item.created_at);
}

export function extractTasksGroupedByBucket(items: Item[]): TasksByBucket[] {
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

export function toggleTaskInBody(body: string, lineIndex: number): string {
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

export function hasAnyTasks(body: string): boolean {
  return body.split("\n").some((line) => TASK_REGEX.test(line));
}
