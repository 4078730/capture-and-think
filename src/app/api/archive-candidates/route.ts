import { NextResponse } from "next/server";
import { checkAuth } from "@/lib/nb/auth";
import { nbAdapter } from "@/lib/nb/adapter";

export async function GET() {
  try {
    const authResult = checkAuth();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get items older than 30 days that are not pinned and active
    const { items, total } = await nbAdapter.getArchiveCandidates(30);

    return NextResponse.json({
      items: items ?? [],
      total: total ?? 0,
    });
  } catch (error) {
    console.error("GET /api/archive-candidates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
