import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseInput } from "@/lib/parser";
import { z } from "zod";

const adfDocumentSchema = z.object({
  version: z.literal(1),
  type: z.literal("doc"),
  content: z.array(z.any()),
});

const createItemSchema = z.object({
  body: z.string(), // 空文字列も許可（新規ノート作成時）
  bucket: z.string().optional(),
  source: z.string().optional(),
  adf_content: adfDocumentSchema.nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = createItemSchema.safeParse(json);
    if (!parsed.success) {
      const errorMessage = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Parse input for hashtags (空文字列の場合は"Untitled"を使用)
    const inputBody = parsed.data.body.trim() || "Untitled";
    const { body: parsedBody, bucket: parsedBucket, pinned } = parseInput(inputBody);
    const body = parsedBody.trim() || "Untitled"; // parseInputの結果が空の場合も"Untitled"を使用
    const bucket = parsed.data.bucket ?? parsedBucket;

    const { data, error } = await supabase
      .from("items")
      .insert({
        user_id: user.id,
        body,
        bucket,
        pinned,
        source: parsed.data.source ?? "pwa",
        triage_state: "pending",
        adf_content: parsed.data.adf_content ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger triage in background (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/triage/${data.id}`, {
      method: "POST",
    }).catch(() => {
      // Ignore errors, triage is best-effort
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "active";
    const bucket = searchParams.get("bucket");
    const category = searchParams.get("category");
    const pinned = searchParams.get("pinned");
    const q = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    let query = supabase
      .from("items")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .eq("status", status)
      // Removed triage_state filter to show all items
      .order("created_at", { ascending: false })
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
    if (q) {
      query = query.or(`body.ilike.%${q}%,summary.ilike.%${q}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("GET /api/items error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
