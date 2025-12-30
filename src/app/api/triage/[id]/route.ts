import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { triageItem } from "@/lib/ai/triage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceClient();

    // Get item
    const { data: item, error: fetchError } = await supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Skip if already processed
    if (item.triage_state === "done" || item.triage_state === "awaiting_approval") {
      return NextResponse.json({ message: "Already triaged" });
    }

    try {
      // Run triage
      const result = await triageItem(item.body, item.bucket);

      // Store AI suggestions for user approval (don't apply yet)
      const { error: updateError } = await supabase
        .from("items")
        .update({
          ai_suggested_bucket: result.bucket,
          ai_suggested_category: result.category,
          ai_suggested_kind: result.kind,
          ai_suggested_summary: result.summary,
          ai_suggested_tags: result.auto_tags,
          ai_confidence: result.confidence,
          triage_state: "awaiting_approval",
        })
        .eq("id", id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ success: true, result, awaiting_approval: true });
    } catch (triageError) {
      // Mark as failed
      await supabase
        .from("items")
        .update({
          triage_state: "failed",
        })
        .eq("id", id);

      console.error("Triage error:", triageError);
      return NextResponse.json(
        { error: "Triage failed", details: String(triageError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("POST /api/triage/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
