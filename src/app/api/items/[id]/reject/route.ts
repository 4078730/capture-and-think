import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the item
    const { data: item, error: fetchError } = await supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.triage_state !== "awaiting_approval") {
      return NextResponse.json(
        { error: "Item is not awaiting approval" },
        { status: 400 }
      );
    }

    // Mark as done without applying AI suggestions
    // Keep original values, clear AI suggestions
    const { error: updateError } = await supabase
      .from("items")
      .update({
        triage_state: "done",
        triaged_at: new Date().toISOString(),
        // Clear AI suggestions
        ai_suggested_bucket: null,
        ai_suggested_category: null,
        ai_suggested_kind: null,
        ai_suggested_summary: null,
        ai_suggested_tags: [],
        ai_confidence: null,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/items/[id]/reject error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
