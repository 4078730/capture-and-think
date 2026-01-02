import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askQuestion } from "@/lib/ai/ask";
import { z } from "zod";

const askSchema = z.object({
  query: z.string().min(1),
  bucket: z.string().optional(),
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
    const parsed = askSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { query, bucket } = parsed.data;

    // まず全アイテムを取得（最新20件）
    let searchQuery = supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20);

    if (bucket) {
      searchQuery = searchQuery.eq("bucket", bucket);
    }

    const { data: items, error } = await searchQuery;

    console.log(`Ask: found ${items?.length ?? 0} items for query: ${query}`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate answer using AI
    const result = await askQuestion(query, items ?? []);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/ask error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
