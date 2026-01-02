import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables");
      const origin = new URL(request.url).origin;
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent("Server configuration error. Please contact support.")}`
      );
    }

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
      try {
        const supabase = await createClient();
        const { error, data } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Code exchange error:", error);
          return NextResponse.redirect(
            `${origin}/auth/login?error=${encodeURIComponent(error.message || "Failed to exchange authorization code")}`
          );
        }

        if (!data.session) {
          console.error("No session created after code exchange");
          return NextResponse.redirect(
            `${origin}/auth/login?error=${encodeURIComponent("Failed to create session")}`
          );
        }

        return NextResponse.redirect(`${origin}${next}`);
      } catch (clientError) {
        console.error("Supabase client error:", clientError);
        return NextResponse.redirect(
          `${origin}/auth/login?error=${encodeURIComponent("Authentication service error. Please try again.")}`
        );
      }
    }

    // No code provided
    return NextResponse.redirect(`${origin}/auth/login?error=No authorization code provided`);
  } catch (err) {
    console.error("Auth callback exception:", err);
    const origin = new URL(request.url).origin;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(`Authentication failed: ${errorMessage}`)}`
    );
  }
}
