import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { triageItem } from "@/lib/ai/triage";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient();

    // Get item_ids from body if provided
    let itemIds: string[] | undefined;
    try {
      const json = await request.json();
      itemIds = json.item_ids;
    } catch {
      // No body provided, process all pending
    }

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

    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const result = await triageItem(item.body, item.bucket);

        await supabase
          .from("items")
          .update({
            bucket: result.bucket,
            category: result.category,
            kind: result.kind,
            summary: result.summary,
            auto_tags: result.auto_tags,
            confidence: result.confidence,
            triage_state: "done",
            triaged_at: new Date().toISOString(),
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
