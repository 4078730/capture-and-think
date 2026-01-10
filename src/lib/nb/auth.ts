import { NextRequest, NextResponse } from "next/server";

const SINGLE_USER_MODE = process.env.SINGLE_USER_MODE === "true";
const AUTH_USER = process.env.NB_AUTH_USER;
const AUTH_PASS = process.env.NB_AUTH_PASS;

export interface AuthResult {
  authenticated: boolean;
  error?: string;
}

export function checkAuth(request?: NextRequest): AuthResult {
  if (SINGLE_USER_MODE) {
    if (!AUTH_USER || !AUTH_PASS) {
      return { authenticated: true };
    }

    if (!request) {
      return { authenticated: true };
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Basic ")) {
      return { authenticated: false, error: "Unauthorized" };
    }

    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    const [user, pass] = decoded.split(":");

    if (user !== AUTH_USER || pass !== AUTH_PASS) {
      return { authenticated: false, error: "Invalid credentials" };
    }

    return { authenticated: true };
  }

  return { authenticated: true };
}

export function checkAuthMiddleware(request: NextRequest): NextResponse | null {
  const result = checkAuth(request);
  if (!result.authenticated) {
    return NextResponse.json({ error: result.error || "Unauthorized" }, { status: 401 });
  }
  return null;
}
