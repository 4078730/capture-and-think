import { NextRequest, NextResponse } from "next/server";
import { nbAdapter } from "@/lib/nb/adapter";
import { checkAuth } from "@/lib/nb/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = checkAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const item = await nbAdapter.unarchive(id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ id: item.id, status: item.status });
  } catch (error) {
    console.error("POST /api/items/[id]/unarchive error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
