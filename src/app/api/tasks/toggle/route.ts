import { NextRequest, NextResponse } from "next/server";
import { nbAdapter } from "@/lib/nb/adapter";
import { authenticateMCPRequest } from "@/lib/nb/mcp-auth";
import { toggleTaskInBody } from "@/lib/tasks";
import { z } from "zod";

const toggleSchema = z.object({
  itemId: z.string(),
  lineIndex: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateMCPRequest(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = toggleSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { itemId, lineIndex } = parsed.data;

    const item = await nbAdapter.get(itemId);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const updatedBody = toggleTaskInBody(item.body, lineIndex);
    const updatedItem = await nbAdapter.update(itemId, { body: updatedBody });

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error("POST /api/tasks/toggle error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
