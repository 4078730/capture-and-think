import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateMCPRequest } from "@/lib/mcp-auth";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  item_ids: z.array(z.string().uuid()).min(1),
  updates: z.object({
    bucket: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
  }),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    const json = await request.json();
    const parsed = bulkUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (parsed.data.updates.bucket !== undefined) {
      updateData.bucket = parsed.data.updates.bucket;
    }
    if (parsed.data.updates.category !== undefined) {
      updateData.category = parsed.data.updates.category;
    }
    if (parsed.data.updates.due_date !== undefined) {
      updateData.due_date = parsed.data.updates.due_date;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("items")
      .update(updateData)
      .in("id", parsed.data.item_ids)
      .eq("user_id", auth.userId!)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated_count: data?.length || 0,
      item_ids: data?.map((item) => item.id) || [],
      updates: updateData,
    });
  } catch (error) {
    console.error("MCP POST /items/bulk-update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

