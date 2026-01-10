import { NextRequest, NextResponse } from "next/server";
import { nbAdapter } from "@/lib/nb/adapter";
import { checkAuth } from "@/lib/nb/auth";

export async function GET(request: NextRequest) {
  try {
    const authResult = checkAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get("bucket") || undefined;

    const categories = await nbAdapter.getCategories(bucket);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
