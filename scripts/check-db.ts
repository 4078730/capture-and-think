import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data } = await supabase
    .from("items")
    .select("id, body, triage_state, ai_suggested_bucket, ai_suggested_category")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log("=== Database Items State ===\n");
  console.log("triage_state         | ai_bucket  | ai_category     | body");
  console.log("-".repeat(80));

  data?.forEach((item) => {
    const state = (item.triage_state || "null").padEnd(20);
    const bucket = (item.ai_suggested_bucket || "null").padEnd(10);
    const category = (item.ai_suggested_category || "null").padEnd(15);
    const body = (item.body || "").slice(0, 30);
    console.log(`${state} | ${bucket} | ${category} | ${body}`);
  });
}

check();
