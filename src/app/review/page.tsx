"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ResponsiveLayout } from "@/components/responsive-layout";
import { ApprovalCard } from "@/components/approval-card";
import { SkeletonList } from "@/components/skeleton-card";
import type { Item, Bucket, Kind } from "@/types";

interface ReviewResponse {
  items: Item[];
  total: number;
}

export default function ReviewPage() {
  const queryClient = useQueryClient();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery<ReviewResponse>({
    queryKey: ["review-items"],
    queryFn: async () => {
      const res = await fetch("/api/review");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, overrides }: { id: string; overrides?: { bucket?: Bucket; kind?: Kind } }) => {
      const res = await fetch(`/api/items/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: overrides ? JSON.stringify(overrides) : undefined,
      });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onMutate: ({ id }) => {
      setProcessingIds((prev) => new Set(prev).add(id));
    },
    onSuccess: (_, { id }) => {
      toast.success("承認しました");
      // Remove from list optimistically
      queryClient.setQueryData<ReviewResponse>(["review-items"], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((item) => item.id !== id),
          total: old.total - 1,
        };
      });
      // Invalidate inbox queries
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: () => {
      toast.error("承認に失敗しました");
    },
    onSettled: (_, __, { id }) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/items/${id}/reject`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onMutate: (id) => {
      setProcessingIds((prev) => new Set(prev).add(id));
    },
    onSuccess: (_, id) => {
      toast.success("却下しました（元のまま保存）");
      // Remove from list optimistically
      queryClient.setQueryData<ReviewResponse>(["review-items"], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((item) => item.id !== id),
          total: old.total - 1,
        };
      });
      // Invalidate inbox queries
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: () => {
      toast.error("却下に失敗しました");
    },
    onSettled: (_, __, id) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  const handleApprove = async (id: string, overrides?: { bucket?: Bucket; kind?: Kind }) => {
    await approveMutation.mutateAsync({ id, overrides });
  };

  const handleReject = async (id: string) => {
    await rejectMutation.mutateAsync(id);
  };

  const handleApproveAll = async () => {
    if (!data?.items.length) return;

    for (const item of data.items) {
      await approveMutation.mutateAsync({ id: item.id });
    }
  };

  const handleRejectAll = async () => {
    if (!data?.items.length) return;

    for (const item of data.items) {
      await rejectMutation.mutateAsync(item.id);
    }
  };

  return (
    <ResponsiveLayout headerTitle="AI Review" showHeader={false}>
      <div className="app-container">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)] md:border-b-0">
          <div className="flex items-center justify-center h-14 md:hidden">
            <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
            <h1 className="text-lg font-semibold">AI レビュー</h1>
          </div>

          <div className="p-4 md:max-w-4xl md:mx-auto">
            {/* PC Header */}
            <div className="hidden md:flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-purple-500" />
              <h1 className="text-2xl font-bold">AI Review</h1>
              {data && data.total > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-sm font-medium">
                  {data.total} 件
                </span>
              )}
            </div>

            {data && data.items.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApproveAll}
                  disabled={processingIds.size > 0}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-green-500/10 text-green-500 text-sm font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  すべて承認
                </button>
                <button
                  type="button"
                  onClick={handleRejectAll}
                  disabled={processingIds.size > 0}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-red-500/10 text-red-500 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  すべて却下
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:max-w-4xl md:mx-auto">
          {isLoading ? (
            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              <SkeletonList count={4} />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              エラーが発生しました
            </div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Sparkles className="w-12 h-12 mx-auto text-[var(--muted-foreground)] opacity-50" />
              <p className="text-[var(--muted-foreground)]">
                承認待ちのアイテムはありません
              </p>
              <p className="text-sm text-[var(--muted-foreground)] opacity-75">
                新しいメモを追加するとAIが自動で整理します
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              {data?.items.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s`, animationFillMode: "both" }}
                >
                  <ApprovalCard
                    item={item}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isLoading={processingIds.has(item.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResponsiveLayout>
  );
}
