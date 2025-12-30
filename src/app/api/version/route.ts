import { NextResponse } from "next/server";

// Build time is captured at build, not runtime
const BUILD_TIME = new Date().toISOString();

export async function GET() {
  return NextResponse.json({
    version: process.env.npm_package_version || "0.1.0",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
    branch: process.env.VERCEL_GIT_COMMIT_REF || "local",
    deployedAt: BUILD_TIME,
  });
}
