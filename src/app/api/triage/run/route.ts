import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { triageItemWithContext } from "@/lib/ai/triage";

// Vercel Cron calls GET
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow if no CRON_SECRET is set (for development)
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return runTriage();
}

export async function POST(request: NextRequest) {
  // Get item_ids from body if provided
  let itemIds: string[] | undefined;
  try {
    const json = await request.json();
    itemIds = json.item_ids;
  } catch {
    // No body provided, process all pending
  }

  return runTriage(itemIds);
}

async function runTriage(itemIds?: string[]) {
  try {
    const supabase = await createServiceClient();

    // Query for pending items
    let query = supabase
      .from("items")
      .select("*")
      .eq("triage_state", "pending")
      .limit(10); // Process in batches

    if (itemIds && itemIds.length > 0) {
      query = query.in("id", itemIds);
    }

    const { data: items, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ processed: 0, succeeded: 0, failed: 0 });
    }

    // Get recent items for context (from the same user)
    const userIds = [...new Set(items.map((i) => i.user_id))];
    const { data: recentItems } = await supabase
      .from("items")
      .select("body, bucket, category, kind")
      .in("user_id", userIds)
      .eq("status", "active")
      .eq("triage_state", "done")
      .order("created_at", { ascending: false })
      .limit(20);

    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      try {
        // Use enhanced triage with context
        const result = await triageItemWithContext(
          item.body,
          item.bucket,
          recentItems || []
        );

        // Store AI suggestions for user approval (don't apply yet)
        // Also store enhanced title and body
        await supabase
          .from("items")
          .update({
            ai_suggested_bucket: result.bucket,
            ai_suggested_category: result.category,
            ai_suggested_kind: result.kind,
            ai_suggested_summary: result.summary,
            ai_suggested_tags: result.auto_tags,
            ai_confidence: result.confidence,
            // Store enhanced content in memo if available
            memo: result.enhanced_body && result.enhanced_body !== item.body
              ? `## AI整理済み\n${result.enhanced_title ? `**${result.enhanced_title}**\n\n` : ""}${result.enhanced_body}${
                  result.extracted_references && result.extracted_references.length > 0
                    ? "\n\n### 参照\n" + result.extracted_references.map((r) => `- ${r}`).join("\n")
                    : ""
                }`
              : item.memo,
            triage_state: "awaiting_approval",
          })
          .eq("id", item.id);

        succeeded++;
      } catch (error) {
        console.error(`Triage failed for item ${item.id}:`, error);
        await supabase
          .from("items")
          .update({ triage_state: "failed" })
          .eq("id", item.id);
        failed++;
      }
    }

    return NextResponse.json({
      processed: items.length,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error("POST /api/triage/run error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
