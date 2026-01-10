import { NextRequest, NextResponse } from "next/server";
import { nbAdapter } from "@/lib/nb/adapter";
import { triageItem } from "@/lib/ai/triage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const item = await nbAdapter.get(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.triage_state === "done" || item.triage_state === "awaiting_approval") {
      return NextResponse.json({ message: "Already triaged" });
    }

    try {
      const result = await triageItem(item.body, item.bucket);

      await nbAdapter.update(id, {
        bucket: result.bucket,
        category: result.category,
        kind: result.kind,
        summary: result.summary,
        auto_tags: result.auto_tags,
        confidence: result.confidence,
        triage_state: "awaiting_approval",
      });

      return NextResponse.json({ success: true, result, awaiting_approval: true });
    } catch (triageError) {
      await nbAdapter.update(id, { triage_state: "failed" });

      console.error("Triage error:", triageError);
      return NextResponse.json(
        { error: "Triage failed", details: String(triageError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("POST /api/triage/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
