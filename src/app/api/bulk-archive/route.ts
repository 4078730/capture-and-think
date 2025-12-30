import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const bulkArchiveSchema = z.object({
  item_ids: z.array(z.string().uuid()),
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
    const parsed = bulkArchiveSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { error } = await supabase
      .from("items")
      .update({ status: "archived" })
      .eq("user_id", user.id)
      .in("id", parsed.data.item_ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ archived: parsed.data.item_ids.length });
  } catch (error) {
    console.error("POST /api/bulk-archive error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
