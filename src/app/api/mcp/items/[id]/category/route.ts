import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateMCPRequest } from "@/lib/mcp-auth";
import { z } from "zod";

const setCategorySchema = z.object({
  category: z.string().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = await createServiceClient();

    const json = await request.json();
    const parsed = setCategorySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("items")
      .update({ category: parsed.data.category })
      .eq("id", id)
      .eq("user_id", auth.userId!)
      .select("id, category")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("MCP POST /items/[id]/category error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

