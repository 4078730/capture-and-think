import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Bucket, Kind } from "@/types";

const approveSchema = z.object({
  // Optional overrides - user can modify AI suggestions before approving
  bucket: z.enum(["work", "video", "life", "boardgame"]).optional(),
  category: z.string().optional(),
  kind: z.enum(["idea", "task", "note", "reference", "unknown"]).optional(),
});

type ApproveOverrides = {
  bucket?: Bucket;
  category?: string;
  kind?: Kind;
};

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

    // Parse optional overrides
    let overrides: ApproveOverrides = {};
    try {
      const json = await request.json();
      const parsed = approveSchema.safeParse(json);
      if (parsed.success && parsed.data) {
        overrides = parsed.data;
      }
    } catch {
      // No body provided, that's fine
    }

    // Apply AI suggestions (with optional overrides)
    const { error: updateError } = await supabase
      .from("items")
      .update({
        bucket: overrides.bucket ?? item.ai_suggested_bucket ?? item.bucket,
        category: overrides.category ?? item.ai_suggested_category,
        kind: overrides.kind ?? item.ai_suggested_kind ?? "unknown",
        summary: item.ai_suggested_summary,
        auto_tags: item.ai_suggested_tags ?? [],
        confidence: item.ai_confidence ?? 0,
        triage_state: "done",
        triaged_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/items/[id]/approve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
