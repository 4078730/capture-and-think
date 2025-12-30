import { createHash, randomBytes } from "crypto";

export function generateApiKey(): string {
  // Generate a random 32-byte key and encode it as base64
  const key = randomBytes(32).toString("base64url");
  return `ct_${key}`; // ct = capture-think prefix
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
