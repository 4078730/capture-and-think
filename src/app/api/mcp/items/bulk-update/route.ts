import { NextRequest, NextResponse } from "next/server";
import { authenticateMCPRequest } from "@/lib/nb/mcp-auth";
import { nbAdapter } from "@/lib/nb/adapter";
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

    let updatedCount = 0;
    const updatedIds: string[] = [];

    for (const id of parsed.data.item_ids) {
      const result = await nbAdapter.update(id, updateData);
      if (result) {
        updatedCount++;
        updatedIds.push(id);
      }
    }

    return NextResponse.json({
      success: true,
      updated_count: updatedCount,
      item_ids: updatedIds,
      updates: updateData,
    });
  } catch (error) {
    console.error("MCP POST /items/bulk-update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
