import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get items older than 30 days that are not pinned and active
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error, count } = await supabase
      .from("items")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("pinned", false)
      .lt("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
    });
  } catch (error) {
    console.error("GET /api/archive-candidates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
