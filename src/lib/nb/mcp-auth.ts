import { NextRequest } from "next/server";

export interface MCPAuthResult {
  authenticated: boolean;
  error?: string;
}

const SINGLE_USER_MODE = process.env.SINGLE_USER_MODE === "true";
const MCP_API_KEY = process.env.MCP_API_KEY;

export async function authenticateMCPRequest(request: NextRequest): Promise<MCPAuthResult> {
  if (SINGLE_USER_MODE) {
    if (!MCP_API_KEY) {
      return { authenticated: true };
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return { authenticated: false, error: "Missing or invalid Authorization header" };
    }

    const token = authHeader.slice(7);
    if (token !== MCP_API_KEY) {
      return { authenticated: false, error: "Invalid API key" };
    }

    return { authenticated: true };
  }

  const { authenticateMCPRequest: supabaseAuth } = await import("@/lib/mcp-auth");
  return supabaseAuth(request);
}
