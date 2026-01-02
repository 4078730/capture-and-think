import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateMCPRequest } from "@/lib/mcp-auth";
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

const updateItemSchema = z.object({
  body: z.string().optional(),
  bucket: z.string().nullable().optional(),
  pinned: z.boolean().optional(),
  due_date: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  adf_content: adfDocumentSchema.nullable().optional(),
  subtasks: z.array(subtaskSchema).optional(),
});

// GET - Get single item
export async function GET(
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

    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .eq("user_id", auth.userId!)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("MCP GET /items/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update item
export async function PATCH(
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
    const parsed = updateItemSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("items")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", auth.userId!)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("MCP PATCH /items/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Archive item
export async function DELETE(
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

    const { error } = await supabase
      .from("items")
      .update({
        status: "archived",
        archived_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", auth.userId!);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MCP DELETE /items/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
