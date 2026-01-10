import { NextRequest, NextResponse } from "next/server";
import { authenticateMCPRequest } from "@/lib/nb/mcp-auth";
import { nbAdapter } from "@/lib/nb/adapter";
import { z } from "zod";

const bulkPinSchema = z.object({
  item_ids: z.array(z.string().uuid()).min(1),
  pinned: z.boolean(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = bulkPinSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    let updatedCount = 0;
    const updatedIds: string[] = [];

    for (const id of parsed.data.item_ids) {
      const result = parsed.data.pinned 
        ? await nbAdapter.pin(id)
        : await nbAdapter.unpin(id);
      if (result) {
        updatedCount++;
        updatedIds.push(id);
      }
    }

    return NextResponse.json({
      success: true,
      updated_count: updatedCount,
      item_ids: updatedIds,
      pinned: parsed.data.pinned,
    });
  } catch (error) {
    console.error("MCP POST /items/bulk-pin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
