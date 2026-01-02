import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateMCPRequest } from "@/lib/mcp-auth";
import { z } from "zod";
import type { Subtask } from "@/types";

const updateSubtaskSchema = z.object({
  text: z.string().min(1).optional(),
  completed: z.boolean().optional(),
});

// DELETE - Delete subtask
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
    const supabase = await createServiceClient();

    // Get current item
    const { data: item, error: fetchError } = await supabase
      .from("items")
      .select("subtasks")
      .eq("id", id)
      .eq("user_id", auth.userId!)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Remove subtask
    const subtasks = ((item.subtasks as Subtask[]) || []).filter(
      (st) => st.id !== subtask_id
    );

    const { data, error } = await supabase
      .from("items")
      .update({ subtasks })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("MCP DELETE /items/[id]/subtasks/[subtask_id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update subtask
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
    const supabase = await createServiceClient();

    const json = await request.json();
    const parsed = updateSubtaskSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    // Get current item
    const { data: item, error: fetchError } = await supabase
      .from("items")
      .select("subtasks")
      .eq("id", id)
      .eq("user_id", auth.userId!)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Update subtask
    const subtasks = ((item.subtasks as Subtask[]) || []).map((st) =>
      st.id === subtask_id
        ? {
            ...st,
            ...(parsed.data.text !== undefined && { text: parsed.data.text }),
            ...(parsed.data.completed !== undefined && { completed: parsed.data.completed }),
          }
        : st
    );

    const { data, error } = await supabase
      .from("items")
      .update({ subtasks })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("MCP PATCH /items/[id]/subtasks/[subtask_id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

