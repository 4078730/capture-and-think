"use client";

import { useState } from "react";
import { Search, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Navigation } from "@/components/navigation";
import { BucketSelector } from "@/components/bucket-selector";
import { ItemCard } from "@/components/item-card";
import { useItems, usePinItem, useArchiveItem } from "@/hooks/use-items";
import type { Bucket } from "@/types";
import { cn } from "@/lib/utils";

export default function InboxPage() {
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [search, setSearch] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useState(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  });

  const { data, isLoading, error } = useItems({
    status: "active",
    bucket: bucket ?? undefined,
    pinned: pinnedOnly || undefined,
    q: debouncedSearch || undefined,
  });

  const pinItem = usePinItem();
  const archiveItem = useArchiveItem();

  const handlePin = async (id: string, pinned: boolean) => {
    try {
      await pinItem.mutateAsync({ id, pinned });
    } catch {
      toast.error("更新に失敗しました");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveItem.mutateAsync(id);
      toast.success("アーカイブしました", {
        action: {
          label: "元に戻す",
          onClick: async () => {
            await fetch(`/api/items/${id}/unarchive`, { method: "POST" });
            toast.success("元に戻しました");
          },
        },
      });
    } catch {
      toast.error("アーカイブに失敗しました");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="flex items-center justify-center h-14">
          <h1 className="text-lg font-semibold">Inbox</h1>
        </div>

        <div className="p-4 space-y-3">
          <BucketSelector value={bucket} onChange={setBucket} showAll size="sm" />

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="検索..."
                className="w-full pl-9 pr-4 py-2 bg-[var(--secondary)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <button
              type="button"
              onClick={() => setPinnedOnly(!pinnedOnly)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                pinnedOnly
                  ? "bg-yellow-500 text-white"
                  : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-yellow-500"
              )}
            >
              <Star className={cn("w-5 h-5", pinnedOnly && "fill-current")} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            エラーが発生しました
          </div>
        ) : data?.items.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            アイテムがありません
          </div>
        ) : (
          data?.items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onPin={handlePin}
              onArchive={handleArchive}
            />
          ))
        )}

        {data && data.total > data.items.length && (
          <div className="text-center py-4 text-sm text-[var(--muted-foreground)]">
            {data.items.length} / {data.total} 件を表示
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}
