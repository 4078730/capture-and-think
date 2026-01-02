import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateMCPRequest } from "@/lib/mcp-auth";
import { z } from "zod";

const createItemSchema = z.object({
  body: z.string().min(1),
  bucket: z.string().optional(),
  due_date: z.string().optional(), // YYYY-MM-DD format
  memo: z.string().optional(),
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
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let query = supabase
      .from("items")
      .select("id, body, bucket, category, kind, summary, pinned, due_date, memo, subtasks, created_at, status, triage_state", { count: "exact" })
      .eq("user_id", auth.userId!)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (bucket) {
      query = query.eq("bucket", bucket);
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

    const { data, error } = await supabase
      .from("items")
      .insert({
        user_id: auth.userId,
        body: parsed.data.body,
        bucket: parsed.data.bucket,
        due_date: parsed.data.due_date,
        memo: parsed.data.memo,
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
