import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/nb/auth";
import { nbAdapter } from "@/lib/nb/adapter";
import { z } from "zod";

const bulkArchiveSchema = z.object({
  item_ids: z.array(z.string().uuid()),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = checkAuth();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = bulkArchiveSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { success } = await nbAdapter.bulkArchive(parsed.data.item_ids);

    return NextResponse.json({ archived: success });
  } catch (error) {
    console.error("POST /api/bulk-archive error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
