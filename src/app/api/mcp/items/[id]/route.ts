import { NextRequest, NextResponse } from "next/server";
import { nbAdapter } from "@/lib/nb/adapter";
import { authenticateMCPRequest } from "@/lib/nb/mcp-auth";
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
    const item = await nbAdapter.get(id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("MCP GET /items/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const json = await request.json();
    const parsed = updateItemSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const item = await nbAdapter.update(id, parsed.data as any);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("MCP PATCH /items/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const item = await nbAdapter.archive(id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MCP DELETE /items/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
