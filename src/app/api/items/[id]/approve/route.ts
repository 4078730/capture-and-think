import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/nb/auth";
import { nbAdapter } from "@/lib/nb/adapter";
import { z } from "zod";
import type { Kind } from "@/types";

const approveSchema = z.object({
  bucket: z.string().optional(),
  category: z.string().optional(),
  kind: z.enum(["idea", "task", "note", "reference", "unknown"]).optional(),
});

type ApproveOverrides = {
  bucket?: string;
  category?: string;
  kind?: Kind;
};

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

    let overrides: ApproveOverrides = {};
    try {
      const json = await request.json();
      const parsed = approveSchema.safeParse(json);
      if (parsed.success && parsed.data) {
        overrides = parsed.data;
      }
    } catch {
    }

    await nbAdapter.update(id, {
      bucket: (overrides.bucket ?? item.bucket) as any,
      category: overrides.category ?? item.category,
      kind: overrides.kind ?? item.kind ?? "unknown",
      triage_state: "done",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/items/[id]/approve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
