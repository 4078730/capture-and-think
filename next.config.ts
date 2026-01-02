import type { NextConfig } from "next";
import { execSync } from "child_process";

// Get git info at build time
let gitCommitSha = "";
let gitCommitMessage = "";
let gitCommitDate = "";

try {
  gitCommitSha = execSync("git rev-parse --short HEAD").toString().trim();
  gitCommitMessage = execSync("git log -1 --pretty=%s").toString().trim();
  gitCommitDate = execSync("git log -1 --pretty=%ci").toString().trim();
} catch {
  // Git not available
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  env: {
    NEXT_PUBLIC_GIT_COMMIT_SHA: gitCommitSha,
    NEXT_PUBLIC_GIT_COMMIT_MESSAGE: gitCommitMessage,
    NEXT_PUBLIC_GIT_COMMIT_DATE: gitCommitDate,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
