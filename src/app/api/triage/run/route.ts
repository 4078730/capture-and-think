import { NextRequest, NextResponse } from "next/server";
import { nbAdapter } from "@/lib/nb/adapter";
import { triageItemWithContext } from "@/lib/ai/triage";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return runTriage();
}

export async function POST(request: NextRequest) {
  let itemIds: string[] | undefined;
  try {
    const json = await request.json();
    itemIds = json.item_ids;
  } catch {
  }

  return runTriage(itemIds);
}

async function runTriage(itemIds?: string[]) {
  try {
    const { items: allItems } = await nbAdapter.list({ status: "active", limit: 100 });
    
    let pendingItems = allItems.filter(item => item.triage_state === "pending");
    
    if (itemIds && itemIds.length > 0) {
      pendingItems = pendingItems.filter(item => itemIds.includes(item.id));
    }
    
    pendingItems = pendingItems.slice(0, 10);

    if (pendingItems.length === 0) {
      return NextResponse.json({ processed: 0, succeeded: 0, failed: 0 });
    }

    const { items: recentItems } = await nbAdapter.list({
      status: "active",
      limit: 20,
    });
    const contextItems = recentItems.filter(i => i.triage_state === "done");

    let succeeded = 0;
    let failed = 0;

    for (const item of pendingItems) {
      try {
        const result = await triageItemWithContext(
          item.body,
          item.bucket,
          contextItems.map(i => ({
            body: i.body,
            bucket: i.bucket,
            category: i.category,
            kind: i.kind,
          }))
        );

        await nbAdapter.update(item.id, {
          bucket: result.bucket,
          category: result.category,
          kind: result.kind,
          summary: result.summary,
          auto_tags: result.auto_tags,
          confidence: result.confidence,
          memo: result.enhanced_body && result.enhanced_body !== item.body
            ? `## AI整理済み\n${result.enhanced_title ? `**${result.enhanced_title}**\n\n` : ""}${result.enhanced_body}${
                result.extracted_references && result.extracted_references.length > 0
                  ? "\n\n### 参照\n" + result.extracted_references.map((r) => `- ${r}`).join("\n")
                  : ""
              }`
            : (item.memo ?? undefined),
          triage_state: "awaiting_approval",
        });

        succeeded++;
      } catch (error) {
        console.error(`Triage failed for item ${item.id}:`, error);
        await nbAdapter.update(item.id, { triage_state: "failed" });
        failed++;
      }
    }

    return NextResponse.json({
      processed: pendingItems.length,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error("POST /api/triage/run error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
