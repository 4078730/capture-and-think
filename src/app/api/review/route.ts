import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/nb/auth";
import { nbAdapter } from "@/lib/nb/adapter";

export async function GET(request: NextRequest) {
  try {
    const authResult = checkAuth();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await nbAdapter.getAwaitingApproval({ limit, offset });

    return NextResponse.json({
      items: result.items || [],
      total: result.total || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("GET /api/review error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
