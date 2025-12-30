import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateMCPRequest } from "@/lib/mcp-auth";
import { z } from "zod";
import type { Subtask } from "@/types";

const addSubtaskSchema = z.object({
  text: z.string().min(1),
});

const toggleSubtaskSchema = z.object({
  subtask_id: z.string().uuid(),
});

// POST - Add subtask
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
    const parsed = addSubtaskSchema.safeParse(json);
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

    // Add new subtask
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      text: parsed.data.text,
      completed: false,
      created_at: new Date().toISOString(),
    };

    const subtasks = [...(item.subtasks as Subtask[] || []), newSubtask];

    const { data, error } = await supabase
      .from("items")
      .update({ subtasks })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data, subtask: newSubtask }, { status: 201 });
  } catch (error) {
    console.error("MCP POST /items/[id]/subtasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Toggle subtask
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
    const parsed = toggleSubtaskSchema.safeParse(json);
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

    // Toggle subtask
    const subtasks = (item.subtasks as Subtask[] || []).map((st) =>
      st.id === parsed.data.subtask_id
        ? { ...st, completed: !st.completed }
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
    console.error("MCP PATCH /items/[id]/subtasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
