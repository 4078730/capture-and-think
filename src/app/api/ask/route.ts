import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/nb/auth";
import { nbAdapter } from "@/lib/nb/adapter";
import { askQuestion } from "@/lib/ai/ask";
import { z } from "zod";

const askSchema = z.object({
  query: z.string().min(1),
  bucket: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = checkAuth();
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = askSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { query, bucket } = parsed.data;

    const { items } = await nbAdapter.list({
      status: "active",
      bucket: bucket as any,
      limit: 20,
    });

    console.log(`Ask: found ${items?.length ?? 0} items for query: ${query}`);

    const result = await askQuestion(query, items ?? []);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/ask error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
