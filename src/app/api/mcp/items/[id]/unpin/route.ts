import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateMCPRequest } from "@/lib/mcp-auth";

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

    const { data, error } = await supabase
      .from("items")
      .update({ pinned: false })
      .eq("id", id)
      .eq("user_id", auth.userId!)
      .select("id, pinned")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("MCP POST /items/[id]/unpin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

