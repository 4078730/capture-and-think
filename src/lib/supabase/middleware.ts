import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables in middleware");
    // Allow request to continue but authentication will fail
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protected routes
    const protectedPaths = ["/", "/inbox", "/ask", "/review", "/settings"];
    const publicApiPaths = ["/api/triage", "/api/version", "/api/mcp"];

    const isPublicApi = publicApiPaths.some((path) =>
      request.nextUrl.pathname.startsWith(path)
    );
    const isProtectedPath = protectedPaths.some(
      (path) => request.nextUrl.pathname === path
    ) || (request.nextUrl.pathname.startsWith("/api/") && !isPublicApi);

    if (isProtectedPath && !user && !request.nextUrl.pathname.startsWith("/auth")) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error("Middleware auth error:", error);
    // Continue with request even if auth check fails
  }

  return supabaseResponse;
}
