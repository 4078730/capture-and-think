import { NextRequest, NextResponse } from "next/server";
import { nbAdapter } from "@/lib/nb/adapter";
import { authenticateMCPRequest } from "@/lib/nb/mcp-auth";
import { extractTasksGroupedByBucket } from "@/lib/tasks";

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateMCPRequest(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeCompleted = searchParams.get("includeCompleted") !== "false";

    const result = await nbAdapter.list({ status: "active", limit: 500 });
    const tasksByBucket = extractTasksGroupedByBucket(result.items);

    if (!includeCompleted) {
      for (const group of tasksByBucket) {
        group.tasks = group.tasks.filter((t) => !t.completed);
        group.totalCount = group.tasks.length;
        group.completedCount = 0;
      }
    }

    const totalTasks = tasksByBucket.reduce((acc, g) => acc + g.totalCount, 0);
    const completedTasks = tasksByBucket.reduce((acc, g) => acc + g.completedCount, 0);

    return NextResponse.json({
      groups: tasksByBucket,
      total: totalTasks,
      completed: completedTasks,
    });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
