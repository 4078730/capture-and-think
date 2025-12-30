"use client";

import { useState } from "react";
import { Search, Star, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Navigation } from "@/components/navigation";
import { BucketSelector } from "@/components/bucket-selector";
import { ItemCard } from "@/components/item-card";
import { ItemModal } from "@/components/item-modal";
import { SwipeableItem } from "@/components/swipeable-item";
import { ArchiveCandidatesBanner } from "@/components/archive-candidates-banner";
import { useItems, usePinItem, useArchiveItem, useUpdateItem, useCategories } from "@/hooks/use-items";
import type { Bucket, Item } from "@/types";
import { cn } from "@/lib/utils";

export default function InboxPage() {
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Debounce search
  useState(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  });

  const { data: categoriesData } = useCategories(bucket);
  const categories = categoriesData?.categories ?? [];

  const { data, isLoading, error } = useItems({
    status: "active",
    bucket: bucket ?? undefined,
    category: category ?? undefined,
    pinned: pinnedOnly || undefined,
    q: debouncedSearch || undefined,
  });

  const pinItem = usePinItem();
  const archiveItem = useArchiveItem();
  const updateItem = useUpdateItem();

  // Reset category when bucket changes
  const handleBucketChange = (newBucket: Bucket | null) => {
    setBucket(newBucket);
    setCategory(null);
  };

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

  const handleUpdate = async (id: string, data: { body?: string; bucket?: Bucket | null }) => {
    await updateItem.mutateAsync({ id, ...data });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="flex items-center justify-center h-14">
          <h1 className="text-lg font-semibold">Inbox</h1>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <BucketSelector value={bucket} onChange={handleBucketChange} showAll size="sm" />

            {categories.length > 0 && (
              <div className="relative">
                <select
                  value={category ?? ""}
                  onChange={(e) => setCategory(e.target.value || null)}
                  className="appearance-none h-8 pl-3 pr-8 bg-[var(--secondary)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
                >
                  <option value="">全カテゴリ</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--muted-foreground)]" />
              </div>
            )}
          </div>

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
        <ArchiveCandidatesBanner />

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
            <SwipeableItem
              key={item.id}
              onSwipeLeft={() => handleArchive(item.id)}
            >
              <ItemCard
                item={item}
                onPin={handlePin}
                onArchive={handleArchive}
                onClick={setSelectedItem}
              />
            </SwipeableItem>
          ))
        )}

        {data && data.total > data.items.length && (
          <div className="text-center py-4 text-sm text-[var(--muted-foreground)]">
            {data.items.length} / {data.total} 件を表示
          </div>
        )}
      </main>

      <Navigation />

      <ItemModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={handleUpdate}
        onPin={handlePin}
        onArchive={handleArchive}
      />
    </div>
  );
}
