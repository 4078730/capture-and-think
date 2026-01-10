import { NextRequest, NextResponse } from "next/server";
import { authenticateMCPRequest } from "@/lib/nb/mcp-auth";
import { nbAdapter } from "@/lib/nb/adapter";
import { z } from "zod";
import type { Subtask } from "@/types";

const addSubtaskSchema = z.object({
  text: z.string().min(1),
});

const toggleSubtaskSchema = z.object({
  subtask_id: z.string().uuid(),
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

    const json = await request.json();
    const parsed = addSubtaskSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const item = await nbAdapter.get(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      text: parsed.data.text,
      completed: false,
      created_at: new Date().toISOString(),
    };

    const subtasks = [...(item.subtasks || []), newSubtask];
    const updatedItem = await nbAdapter.update(id, { subtasks });

    return NextResponse.json({ item: updatedItem, subtask: newSubtask }, { status: 201 });
  } catch (error) {
    console.error("MCP POST /items/[id]/subtasks error:", error);
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
    const parsed = toggleSubtaskSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const item = await nbAdapter.get(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const subtasks = (item.subtasks || []).map((st) =>
      st.id === parsed.data.subtask_id
        ? { ...st, completed: !st.completed }
        : st
    );

    const updatedItem = await nbAdapter.update(id, { subtasks });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("MCP PATCH /items/[id]/subtasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
