import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const error_param = searchParams.get("error");
    const error_description = searchParams.get("error_description");
    const next = searchParams.get("next") ?? "/";

    // Handle OAuth error response
    if (error_param) {
      console.error("OAuth error:", error_param, error_description);
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(error_description || error_param)}`
      );
    }

    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Code exchange error:", error.message);
        return NextResponse.redirect(
          `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    // No code provided
    return NextResponse.redirect(`${origin}/auth/login?error=No authorization code provided`);
  } catch (err) {
    console.error("Auth callback exception:", err);
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent("Authentication failed. Please try again.")}`
    );
  }
}
