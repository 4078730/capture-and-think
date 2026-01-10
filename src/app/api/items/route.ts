import { NextRequest, NextResponse } from "next/server";
import { nbAdapter } from "@/lib/nb/adapter";
import { checkAuth } from "@/lib/nb/auth";
import { parseInput } from "@/lib/parser";
import { z } from "zod";
import type { Bucket, Source } from "@/types";

const adfDocumentSchema = z.object({
  version: z.literal(1),
  type: z.literal("doc"),
  content: z.array(z.any()),
});

const createItemSchema = z.object({
  body: z.string(),
  bucket: z.string().optional(),
  source: z.string().optional(),
  adf_content: adfDocumentSchema.nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = checkAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = createItemSchema.safeParse(json);
    if (!parsed.success) {
      const errorMessage = parsed.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const inputBody = parsed.data.body.trim() || "Untitled";
    const { body: parsedBody, bucket: parsedBucket, pinned } = parseInput(inputBody);
    const body = parsedBody.trim() || "Untitled";
    const bucket = (parsed.data.bucket ?? parsedBucket) as Bucket | undefined;

    const item = await nbAdapter.create({
      body,
      bucket,
      pinned,
      source: (parsed.data.source ?? "pwa") as Source,
    });

    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/triage/${item.id}`, {
      method: "POST",
    }).catch(() => {});

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("POST /api/items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = checkAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") ?? "active") as "active" | "archived";
    const bucket = searchParams.get("bucket") as Bucket | null;
    const category = searchParams.get("category");
    const pinned = searchParams.get("pinned") === "true" ? true : undefined;
    const q = searchParams.get("q") || undefined;
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const result = await nbAdapter.list({
      status,
      bucket,
      category,
      pinned,
      q,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
