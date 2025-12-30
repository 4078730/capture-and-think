"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Image, Link, Sparkles, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveLayout } from "@/components/responsive-layout";
import { BucketSelector } from "@/components/bucket-selector";
import { useCreateItem } from "@/hooks/use-items";
import type { Bucket } from "@/types";
import { cn } from "@/lib/utils";

interface EnrichResponse {
  title: string;
  summary: string;
  body: string;
  suggestedBucket?: string;
  tags: string[];
  references: string[];
}

export default function CapturePage() {
  const [body, setBody] = useState("");
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [image, setImage] = useState<{ data: string; type: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [detectedUrls, setDetectedUrls] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createItem = useCreateItem();

  // Auto focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Detect URLs in body
  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
    const urls = body.match(urlRegex) || [];
    setDetectedUrls(urls.slice(0, 5)); // Max 5 URLs
  }, [body]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("5MB以下の画像を選択してください");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      // Extract base64 data
      const base64Data = dataUrl.split(",")[1];
      setImage({ data: base64Data, type: file.type });
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEnrich = async () => {
    if (!body.trim() && !image && detectedUrls.length === 0) {
      toast.error("テキスト、URL、または画像を入力してください");
      return;
    }

    setIsEnriching(true);
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: body.trim() || undefined,
          url: detectedUrls[0] || undefined,
          image: image?.data || undefined,
          imageType: image?.type || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Enrichment failed");
      }

      const result: EnrichResponse = await res.json();

      // Update body with enriched content
      const enrichedBody = `${result.title}\n\n${result.body}${
        result.references.length > 0
          ? "\n\n参照:\n" + result.references.map((r) => `- ${r}`).join("\n")
          : ""
      }`;
      setBody(enrichedBody);

      // Set suggested bucket
      if (result.suggestedBucket) {
        const validBuckets: Bucket[] = ["work", "video", "life", "boardgame"];
        if (validBuckets.includes(result.suggestedBucket as Bucket)) {
          setBucket(result.suggestedBucket as Bucket);
        }
      }

      toast.success("AIが内容を整理しました");
    } catch (error) {
      console.error("Enrich error:", error);
      toast.error("AIの解析に失敗しました");
    } finally {
      setIsEnriching(false);
    }
  };

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
      removeImage();
      textareaRef.current?.focus();
    } catch {
      toast.error("保存に失敗しました");
    }
  };

  const hasContent = body.trim() || image || detectedUrls.length > 0;

  return (
    <ResponsiveLayout headerTitle="Capture & Think" showHeader={true}>
      <div className="capture-container flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-2rem)] p-4">
        {/* PC Header */}
        <h1 className="hidden md:block text-2xl font-bold mb-6">Capture</h1>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-32 rounded-lg border border-[var(--border)]"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 p-1 bg-[var(--destructive)] text-white rounded-full hover:opacity-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Detected URLs */}
          {detectedUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {detectedUrls.map((url, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs"
                >
                  <Link className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{url}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="何でも書く...
URLを貼り付けるか、画像を追加してAIに整理してもらえます"
              className="w-full h-full min-h-[200px] p-4 bg-[var(--secondary)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] md:text-lg"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pb-2">
            {/* Image Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              title="画像を追加"
            >
              <Image className="w-5 h-5" />
            </button>

            {/* AI Enrich Button */}
            <button
              type="button"
              onClick={handleEnrich}
              disabled={!hasContent || isEnriching}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                hasContent
                  ? "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20"
                  : "bg-[var(--secondary)] text-[var(--muted-foreground)] cursor-not-allowed"
              )}
              title="AIで整理"
            >
              {isEnriching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">AIで整理</span>
            </button>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <BucketSelector value={bucket} onChange={setBucket} />

            <button
              type="submit"
              disabled={!body.trim() || createItem.isPending}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity md:px-8"
            >
              <Send className="w-5 h-5" />
              {createItem.isPending ? "保存中..." : "送信"}
            </button>
          </div>
        </form>
      </div>
    </ResponsiveLayout>
  );
}
