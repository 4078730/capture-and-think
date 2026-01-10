import { NextRequest, NextResponse } from "next/server";
import { authenticateMCPRequest } from "@/lib/nb/mcp-auth";
import { nbAdapter } from "@/lib/nb/adapter";
import { z } from "zod";

const setCategorySchema = z.object({
  category: z.string().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { id } = await params;

    const json = await request.json();
    const parsed = setCategorySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const item = await nbAdapter.update(id, { category: parsed.data.category });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ id: item.id, category: item.category });
  } catch (error) {
    console.error("MCP POST /items/[id]/category error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
