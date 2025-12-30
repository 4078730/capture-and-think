import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hashApiKey } from "@/lib/api-key";

export interface MCPAuthResult {
  authenticated: boolean;
  userId?: string;
  error?: string;
}

export async function authenticateMCPRequest(request: NextRequest): Promise<MCPAuthResult> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, error: "Missing or invalid Authorization header" };
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  // Validate token format
  if (!token.startsWith("ct_")) {
    return { authenticated: false, error: "Invalid API key format" };
  }

  const keyHash = hashApiKey(token);
  const supabase = await createServiceClient();

  // Look up the key
  const { data: keyData, error } = await supabase
    .from("api_keys")
    .select("id, user_id, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !keyData) {
    return { authenticated: false, error: "Invalid API key" };
  }

  // Check expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { authenticated: false, error: "API key expired" };
  }

  // Update last_used_at (fire and forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyData.id)
    .then(() => {});

  return { authenticated: true, userId: keyData.user_id };
}
