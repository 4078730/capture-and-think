import { NextRequest, NextResponse } from "next/server";
import { authenticateMCPRequest } from "@/lib/nb/mcp-auth";
import { nbAdapter } from "@/lib/nb/adapter";
import { z } from "zod";

const updateSubtaskSchema = z.object({
  text: z.string().min(1).optional(),
  completed: z.boolean().optional(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtask_id: string }> }
) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { id, subtask_id } = await params;

    const item = await nbAdapter.get(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const subtasks = (item.subtasks || []).filter((st) => st.id !== subtask_id);

    const updatedItem = await nbAdapter.update(id, { subtasks });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("MCP DELETE /items/[id]/subtasks/[subtask_id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtask_id: string }> }
) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { id, subtask_id } = await params;

    const json = await request.json();
    const parsed = updateSubtaskSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const item = await nbAdapter.get(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const subtasks = (item.subtasks || []).map((st) =>
      st.id === subtask_id
        ? {
            ...st,
            ...(parsed.data.text !== undefined && { text: parsed.data.text }),
            ...(parsed.data.completed !== undefined && { completed: parsed.data.completed }),
          }
        : st
    );

    const updatedItem = await nbAdapter.update(id, { subtasks });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("MCP PATCH /items/[id]/subtasks/[subtask_id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
