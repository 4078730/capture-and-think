import { type NextRequest, NextResponse } from "next/server";

const AUTH_USER = process.env.NB_AUTH_USER;
const AUTH_PASS = process.env.NB_AUTH_PASS;
const SINGLE_USER_MODE = process.env.SINGLE_USER_MODE === "true";

export async function middleware(request: NextRequest) {
  if (SINGLE_USER_MODE) {
    if (!AUTH_USER || !AUTH_PASS) {
      return NextResponse.next();
    }

    const authHeader = request.headers.get("authorization");
    
    if (request.nextUrl.pathname.startsWith("/api/")) {
      if (!authHeader?.startsWith("Basic ")) {
        return new NextResponse("Unauthorized", {
          status: 401,
          headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
        });
      }

      const base64 = authHeader.slice(6);
      const decoded = Buffer.from(base64, "base64").toString("utf-8");
      const [user, pass] = decoded.split(":");

      if (user !== AUTH_USER || pass !== AUTH_PASS) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    return NextResponse.next();
  }

  const { updateSession } = await import("@/lib/supabase/middleware");
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
