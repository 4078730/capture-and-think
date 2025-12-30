import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTokensFromCode } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings?calendar_error=auth_denied", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?calendar_error=no_code", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Save tokens to user_settings
    const { error: upsertError } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        google_calendar_token: tokens,
        google_calendar_enabled: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (upsertError) {
      console.error("Failed to save tokens:", upsertError);
      return NextResponse.redirect(
        new URL("/settings?calendar_error=save_failed", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/settings?calendar_success=true", request.url)
    );
  } catch (error) {
    console.error("GET /api/calendar/callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?calendar_error=unknown", request.url)
    );
  }
}
