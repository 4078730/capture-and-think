import { NextRequest, NextResponse } from "next/server";
import { nbAdapter } from "@/lib/nb/adapter";
import { authenticateMCPRequest } from "@/lib/nb/mcp-auth";
import { parseInput } from "@/lib/parser";
import { z } from "zod";
import type { Bucket, Source } from "@/types";

const adfDocumentSchema = z.object({
  version: z.literal(1),
  type: z.literal("doc"),
  content: z.array(z.any()),
});

const subtaskSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  created_at: z.string(),
});

const createItemSchema = z.object({
  body: z.string(),
  bucket: z.string().optional(),
  due_date: z.string().optional(),
  memo: z.string().optional(),
  summary: z.string().nullable().optional(),
  adf_content: adfDocumentSchema.nullable().optional(),
  subtasks: z.array(subtaskSchema).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") ?? "active") as "active" | "archived";
    const bucket = searchParams.get("bucket") as Bucket | null;
    const category = searchParams.get("category");
    const pinned = searchParams.get("pinned") === "true" ? true : undefined;
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const result = await nbAdapter.list({
      status,
      bucket,
      category,
      pinned,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("MCP GET /items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = createItemSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const inputBody = parsed.data.body.trim() || "Untitled";
    const { body: parsedBody, bucket: parsedBucket, pinned } = parseInput(inputBody);
    const body = parsedBody.trim() || "Untitled";
    const bucket = (parsed.data.bucket ?? parsedBucket) as Bucket | undefined;

    const item = await nbAdapter.create({
      body,
      bucket,
      pinned,
      source: "mcp" as Source,
      memo: parsed.data.memo,
      due_date: parsed.data.due_date,
    });

    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/triage/${item.id}`, {
      method: "POST",
    }).catch(() => {});

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("MCP POST /items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
