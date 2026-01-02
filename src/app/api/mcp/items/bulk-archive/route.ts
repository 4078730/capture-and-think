import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateMCPRequest } from "@/lib/mcp-auth";
import { z } from "zod";

const bulkArchiveSchema = z.object({
  item_ids: z.array(z.string().uuid()).min(1),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    const json = await request.json();
    const parsed = bulkArchiveSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("items")
      .update({
        status: "archived",
        archived_at: new Date().toISOString(),
      })
      .in("id", parsed.data.item_ids)
      .eq("user_id", auth.userId!)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      archived_count: data?.length || 0,
      item_ids: data?.map((item) => item.id) || [],
    });
  } catch (error) {
    console.error("MCP POST /items/bulk-archive error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

