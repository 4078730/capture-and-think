import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateMCPRequest } from "@/lib/mcp-auth";

// GET - Search items
export async function GET(request: NextRequest) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    if (!q) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("items")
      .select("id, body, bucket, category, kind, summary, pinned, due_date, created_at, status")
      .eq("user_id", auth.userId!)
      .or(`body.ilike.%${q}%,summary.ilike.%${q}%,memo.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: data ?? [],
      query: q,
    });
  } catch (error) {
    console.error("MCP GET /search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
