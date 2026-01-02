import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateMCPRequest } from "@/lib/mcp-auth";
import { parseInput } from "@/lib/parser";
import { z } from "zod";

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
  body: z.string(), // 空文字列も許可（新規ノート作成時）
  bucket: z.string().optional(),
  due_date: z.string().optional(), // YYYY-MM-DD format
  memo: z.string().optional(),
  summary: z.string().nullable().optional(),
  adf_content: adfDocumentSchema.nullable().optional(),
  subtasks: z.array(subtaskSchema).optional(),
});

// GET - List items
export async function GET(request: NextRequest) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") ?? "active";
    const bucket = searchParams.get("bucket");
    const category = searchParams.get("category");
    const pinned = searchParams.get("pinned");
    const dueDate = searchParams.get("due_date");
    const sort = searchParams.get("sort") ?? "newest";
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let query = supabase
      .from("items")
      .select("id, body, bucket, category, kind, summary, pinned, due_date, memo, subtasks, adf_content, created_at, status, triage_state", { count: "exact" })
      .eq("user_id", auth.userId!)
      .eq("status", status)
      .range(offset, offset + limit - 1);

    if (bucket) {
      query = query.eq("bucket", bucket);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (pinned === "true") {
      query = query.eq("pinned", true);
    }
    if (dueDate) {
      query = query.eq("due_date", dueDate);
    }

    // Apply sorting
    switch (sort) {
      case "oldest":
        query = query.order("created_at", { ascending: true });
        break;
      case "due_date":
        query = query.order("due_date", { ascending: true, nullsFirst: false });
        break;
      case "pinned_first":
        query = query.order("pinned", { ascending: false }).order("created_at", { ascending: false });
        break;
      case "bucket":
        query = query.order("bucket", { ascending: true }).order("created_at", { ascending: false });
        break;
      default: // newest
        query = query.order("created_at", { ascending: false });
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("MCP GET /items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create item
export async function POST(request: NextRequest) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    const json = await request.json();
    const parsed = createItemSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    // Parse input for hashtags (空文字列の場合は"Untitled"を使用)
    const inputBody = parsed.data.body.trim() || "Untitled";
    const { body: parsedBody, bucket: parsedBucket, pinned } = parseInput(inputBody);
    const body = parsedBody.trim() || "Untitled";
    const bucket = parsed.data.bucket ?? parsedBucket;

    const { data, error } = await supabase
      .from("items")
      .insert({
        user_id: auth.userId,
        body,
        bucket,
        pinned: pinned || false,
        due_date: parsed.data.due_date,
        memo: parsed.data.memo,
        summary: parsed.data.summary,
        adf_content: parsed.data.adf_content,
        subtasks: parsed.data.subtasks,
        source: "mcp",
        triage_state: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger triage in background
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/triage/${data.id}`, {
      method: "POST",
    }).catch(() => {});

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("MCP POST /items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
