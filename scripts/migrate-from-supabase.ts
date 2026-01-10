import * as fs from "fs/promises";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import matter from "gray-matter";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const NB_DIR = process.env.NB_DIR || path.join(process.cwd(), "data/notes");

interface SupabaseItem {
  id: string;
  user_id: string;
  body: string;
  bucket: string | null;
  pinned: boolean;
  status: string;
  category: string | null;
  kind: string;
  summary: string | null;
  auto_tags: string[];
  confidence: number;
  triage_state: string;
  triaged_at: string | null;
  source: string | null;
  memo: string | null;
  due_date: string | null;
  subtasks: any[];
  ai_suggested_bucket: string | null;
  ai_suggested_category: string | null;
  ai_suggested_kind: string | null;
  ai_suggested_summary: string | null;
  ai_suggested_tags: string[];
  ai_confidence: number | null;
  google_calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
}

async function migrate() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log("Fetching items from Supabase...");
  const { data: items, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch items:", error);
    process.exit(1);
  }

  console.log(`Found ${items?.length || 0} items`);

  const activeDir = path.join(NB_DIR, "home");
  const archivedDir = path.join(NB_DIR, "archived");

  await fs.mkdir(activeDir, { recursive: true });
  await fs.mkdir(archivedDir, { recursive: true });

  let migrated = 0;
  let failed = 0;

  for (const item of items as SupabaseItem[]) {
    try {
      const frontmatter = {
        id: item.id,
        bucket: item.bucket,
        pinned: item.pinned,
        status: item.status,
        kind: item.kind || "unknown",
        category: item.category,
        summary: item.summary,
        auto_tags: item.auto_tags || [],
        confidence: item.confidence || 0,
        triage_state: item.triage_state || "pending",
        triaged_at: item.triaged_at,
        source: item.source,
        memo: item.memo,
        due_date: item.due_date,
        subtasks: item.subtasks || [],
        ai_suggested_bucket: item.ai_suggested_bucket,
        ai_suggested_category: item.ai_suggested_category,
        ai_suggested_kind: item.ai_suggested_kind,
        ai_suggested_summary: item.ai_suggested_summary,
        ai_suggested_tags: item.ai_suggested_tags || [],
        ai_confidence: item.ai_confidence,
        google_calendar_event_id: item.google_calendar_event_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };

      const content = matter.stringify(item.body || "", frontmatter);
      const date = new Date(item.created_at).toISOString().split("T")[0];
      const filename = `${date}_${item.id.slice(0, 8)}.md`;

      const targetDir = item.status === "archived" ? archivedDir : activeDir;
      const filepath = path.join(targetDir, filename);

      await fs.writeFile(filepath, content, "utf-8");
      migrated++;
      console.log(`Migrated: ${filename}`);
    } catch (err) {
      console.error(`Failed to migrate item ${item.id}:`, err);
      failed++;
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${items?.length || 0}`);
}

migrate().catch(console.error);
