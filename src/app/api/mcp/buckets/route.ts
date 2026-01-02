import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateMCPRequest } from "@/lib/mcp-auth";

export async function GET(request: NextRequest) {
  const auth = await authenticateMCPRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // Get distinct buckets with count
    const { data, error } = await supabase
      .from("items")
      .select("bucket")
      .eq("user_id", auth.userId!)
      .eq("status", "active")
      .not("bucket", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate counts
    const bucketCounts: Record<string, number> = {};
    for (const item of data ?? []) {
      if (item.bucket) {
        bucketCounts[item.bucket] = (bucketCounts[item.bucket] || 0) + 1;
      }
    }

    // Default buckets
    const defaultBuckets = [
      "management",
      "rfa",
      "cxc",
      "paper",
      "video",
      "life",
      "game",
    ];

    const buckets = defaultBuckets.map((bucket) => ({
      id: bucket,
      label: bucket.charAt(0).toUpperCase() + bucket.slice(1),
      count: bucketCounts[bucket] || 0,
    }));

    // Add buckets that exist in data but not in default list
    for (const [bucket, count] of Object.entries(bucketCounts)) {
      if (!defaultBuckets.includes(bucket)) {
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

