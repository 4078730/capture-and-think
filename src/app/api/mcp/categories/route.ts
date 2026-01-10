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
    const bucket = searchParams.get("bucket") || undefined;

    const categories = await nbAdapter.getCategories(bucket);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("MCP GET /categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
