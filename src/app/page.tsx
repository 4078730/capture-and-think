"use client";

import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Navigation } from "@/components/navigation";
import { BucketSelector } from "@/components/bucket-selector";
import { useCreateItem } from "@/hooks/use-items";
import type { Bucket } from "@/types";

export default function CapturePage() {
  const [body, setBody] = useState("");
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const createItem = useCreateItem();

  // Auto focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim()) return;

    try {
      await createItem.mutateAsync({
        body: body.trim(),
        bucket: bucket ?? undefined,
        source: "pwa",
      });

      toast.success("保存しました");
      setBody("");
      setBucket(null);
      textareaRef.current?.focus();
    } catch {
      toast.error("保存に失敗しました");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-center h-14 border-b border-[var(--border)]">
        <h1 className="text-lg font-semibold">Capture & Think</h1>
      </header>

      <main className="flex-1 flex flex-col p-4 pb-24">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="何でも書く..."
              className="w-full h-full min-h-[200px] p-4 bg-[var(--secondary)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
          </div>

          <div className="flex flex-col gap-4">
            <BucketSelector value={bucket} onChange={setBucket} />

            <button
              type="submit"
              disabled={!body.trim() || createItem.isPending}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              <Send className="w-5 h-5" />
              {createItem.isPending ? "保存中..." : "送信"}
            </button>
          </div>
        </form>
      </main>

      <Navigation />
    </div>
  );
}
