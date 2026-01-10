import { NextRequest, NextResponse } from "next/server";
import { nbAdapter } from "@/lib/nb/adapter";
import { authenticateMCPRequest } from "@/lib/nb/mcp-auth";

export async function GET(request: NextRequest) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    if (!q) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    const items = await nbAdapter.search(q);
    const limitedItems = items.slice(0, limit);

    return NextResponse.json({
      items: limitedItems,
      query: q,
    });
  } catch (error) {
    console.error("MCP GET /search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
