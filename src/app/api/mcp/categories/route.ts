import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateMCPRequest } from "@/lib/mcp-auth";

export async function GET(request: NextRequest) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket");

    // Get distinct categories with count
    let query = supabase
      .from("items")
      .select("category")
      .eq("user_id", auth.userId!)
      .eq("status", "active")
      .not("category", "is", null);

    if (bucket) {
      query = query.eq("bucket", bucket);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate counts
    const categoryCounts: Record<string, number> = {};
    for (const item of data ?? []) {
      if (item.category) {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }
    }

    const categories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("MCP GET /categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

