import { NextResponse } from "next/server";

// These values are captured at build time
const BUILD_INFO = {
  version: process.env.npm_package_version || "0.1.0",
  commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || "dev",
  message: process.env.VERCEL_GIT_COMMIT_MESSAGE || process.env.NEXT_PUBLIC_GIT_COMMIT_MESSAGE || "No message",
  branch: process.env.VERCEL_GIT_COMMIT_REF || "local",
  deployedAt: new Date().toISOString(),
};

export async function GET() {
  return NextResponse.json(BUILD_INFO);
}
