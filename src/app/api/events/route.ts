import { NextRequest } from "next/server";
import { startWatcher, subscribe } from "@/lib/nb/watcher";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  startWatcher();

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribe((event, filepath) => {
        const data = JSON.stringify({ event, filepath, timestamp: Date.now() });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      });

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: "connected" })}\n\n`));

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
