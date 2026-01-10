import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/nb/auth";
import { nbAdapter } from "@/lib/nb/adapter";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = checkAuth();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const item = await nbAdapter.get(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.triage_state !== "awaiting_approval") {
      return NextResponse.json(
        { error: "Item is not awaiting approval" },
        { status: 400 }
      );
    }

    await nbAdapter.update(id, {
      triage_state: "done",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/items/[id]/reject error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
