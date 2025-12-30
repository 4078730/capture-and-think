import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetAndTest() {
  console.log("=== Reset items to pending state ===\n");

  // Reset 2 items to pending for testing
  const { data: items } = await supabase
    .from("items")
    .select("id, body")
    .eq("status", "active")
    .limit(2);

  if (!items || items.length === 0) {
    console.log("No items found");
    return;
  }

  for (const item of items) {
    await supabase
      .from("items")
      .update({
        triage_state: "pending",
        triaged_at: null,
        ai_suggested_bucket: null,
        ai_suggested_category: null,
        ai_suggested_kind: null,
        ai_suggested_summary: null,
        ai_suggested_tags: [],
        ai_confidence: null,
      })
      .eq("id", item.id);

    console.log(`Reset: ${item.body?.slice(0, 40)}...`);
  }

  console.log("\n✅ Items reset to pending state");
  console.log("\nNow test the triage API by calling:");
  console.log("  curl -X POST http://localhost:3003/api/triage/run");
}

resetAndTest();
