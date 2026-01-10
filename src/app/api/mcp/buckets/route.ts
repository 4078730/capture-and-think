import { NextRequest, NextResponse } from "next/server";
import { nbAdapter } from "@/lib/nb/adapter";
import { authenticateMCPRequest } from "@/lib/nb/mcp-auth";

const DEFAULT_BUCKETS = [
  "management",
  "rfa",
  "cxc",
  "paper",
  "video",
  "life",
  "game",
];

export async function GET(request: NextRequest) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { items } = await nbAdapter.list({ status: "active", limit: 1000 });

    const bucketCounts: Record<string, number> = {};
    for (const item of items) {
      if (item.bucket) {
        bucketCounts[item.bucket] = (bucketCounts[item.bucket] || 0) + 1;
      }
    }

    const buckets = DEFAULT_BUCKETS.map((bucket) => ({
      id: bucket,
      label: bucket.charAt(0).toUpperCase() + bucket.slice(1),
      count: bucketCounts[bucket] || 0,
    }));

    for (const [bucket, count] of Object.entries(bucketCounts)) {
      if (!DEFAULT_BUCKETS.includes(bucket)) {
        buckets.push({
          id: bucket,
          label: bucket.charAt(0).toUpperCase() + bucket.slice(1),
          count,
        });
      }
    }

    return NextResponse.json({
      buckets: buckets.sort((a, b) => b.count - a.count),
    });
  } catch (error) {
    console.error("MCP GET /buckets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
