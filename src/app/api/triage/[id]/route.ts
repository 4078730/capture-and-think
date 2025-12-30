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

    // Skip if already done
    if (item.triage_state === "done") {
      return NextResponse.json({ message: "Already triaged" });
    }

    try {
      // Run triage
      const result = await triageItem(item.body, item.bucket);

      // Update item with triage results
      const { error: updateError } = await supabase
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
        .eq("id", id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ success: true, result });
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
