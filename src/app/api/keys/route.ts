import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey, hashApiKey } from "@/lib/api-key";
import { z } from "zod";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

// GET - List API keys (without showing the actual key)
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: keys, error } = await supabase
      .from("api_keys")
      .select("id, name, created_at, last_used_at, expires_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ keys: keys ?? [] });
  } catch (error) {
    console.error("GET /api/keys error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new API key
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
    const parsed = createKeySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    // Generate new key
    const plainKey = generateApiKey();
    const keyHash = hashApiKey(plainKey);

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        key_hash: keyHash,
        name: parsed.data.name,
      })
      .select("id, name, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the plain key ONLY at creation time
    return NextResponse.json({
      ...data,
      key: plainKey, // This is the only time the key is visible
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/keys error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "Key ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", keyId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/keys error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
