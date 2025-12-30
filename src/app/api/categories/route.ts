import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket");

    // Get distinct categories with count
    let query = supabase
      .from("items")
      .select("category")
      .eq("user_id", user.id)
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
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
