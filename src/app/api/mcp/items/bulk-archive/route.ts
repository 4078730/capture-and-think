import { NextRequest, NextResponse } from "next/server";
import { authenticateMCPRequest } from "@/lib/nb/mcp-auth";
import { nbAdapter } from "@/lib/nb/adapter";
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
    const json = await request.json();
    const parsed = bulkArchiveSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { success } = await nbAdapter.bulkArchive(parsed.data.item_ids);

    return NextResponse.json({
      success: true,
      archived_count: success,
      item_ids: parsed.data.item_ids,
    });
  } catch (error) {
    console.error("MCP POST /items/bulk-archive error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
