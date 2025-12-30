"use client";

import { useMutation } from "@tanstack/react-query";
import type { AskResponse, Bucket } from "@/types";

interface AskInput {
  query: string;
  bucket?: Bucket;
}

export function useAsk() {
  return useMutation({
    mutationFn: async (input: AskInput): Promise<AskResponse> => {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to ask");
      return res.json();
    },
  });
}
