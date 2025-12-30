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

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get items awaiting approval
    const { data: items, error, count } = await supabase
      .from("items")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .eq("triage_state", "awaiting_approval")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: items || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("GET /api/review error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
