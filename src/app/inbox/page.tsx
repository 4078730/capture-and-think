"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Star, ChevronDown, Settings, ArrowUpDown, Calendar, Clock, Tag } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ResponsiveLayout } from "@/components/responsive-layout";
import { BucketSelector } from "@/components/bucket-selector";
import { ItemCard } from "@/components/item-card";
import { ItemModal } from "@/components/item-modal";
import { NoteDetailView } from "@/components/note-detail";
import { SwipeableItem } from "@/components/swipeable-item";
import { ArchiveCandidatesBanner } from "@/components/archive-candidates-banner";
import { SkeletonList } from "@/components/skeleton-card";
import { useItems, usePinItem, useArchiveItem, useUpdateItem, useCategories } from "@/hooks/use-items";
import type { Bucket, Item, Subtask } from "@/types";
import type { ADFDocument } from "@/lib/adf";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "due_date" | "pinned_first" | "bucket";

export default function InboxPage() {
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categoriesData } = useCategories(bucket);
  const categories = categoriesData?.categories ?? [];

  const { data, isLoading, error } = useItems({
    status: "active",
    bucket: bucket ?? undefined,
    category: category ?? undefined,
    pinned: pinnedOnly || undefined,
    q: debouncedSearch || undefined,
  });

  // Sort items locally based on sort option
  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    const items = [...data.items];

    switch (sortBy) {
      case "newest":
        return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "oldest":
        return items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "due_date":
        return items.sort((a, b) => {
          // Items with due dates first, sorted by date
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
      case "pinned_first":
        return items.sort((a, b) => {
          if (a.pinned === b.pinned) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return a.pinned ? -1 : 1;
        });
      case "bucket":
        return items.sort((a, b) => {
          const bucketOrder: Record<string, number> = { management: 0, rfa: 1, cxc: 2, paper: 3, video: 4, life: 5, game: 6 };
          const orderA = a.bucket ? bucketOrder[a.bucket] ?? 4 : 4;
          const orderB = b.bucket ? bucketOrder[b.bucket] ?? 4 : 4;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      default:
        return items;
    }
  }, [data?.items, sortBy]);

  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: "newest", label: "新しい順", icon: <Clock className="w-4 h-4" /> },
    { value: "oldest", label: "古い順", icon: <Clock className="w-4 h-4" /> },
    { value: "due_date", label: "期限順", icon: <Calendar className="w-4 h-4" /> },
    { value: "pinned_first", label: "★優先", icon: <Star className="w-4 h-4" /> },
    { value: "bucket", label: "バケット順", icon: <Tag className="w-4 h-4" /> },
  ];

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

  const handleUpdate = async (
    id: string,
    data: {
      body?: string;
      bucket?: Bucket | null;
      memo?: string;
      due_date?: string | null;
      subtasks?: Subtask[];
    }
  ) => {
    await updateItem.mutateAsync({ id, ...data });
  };

  const settingsLink = (
    <Link
      href="/settings"
      className="p-2 -mr-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] rounded-lg transition-colors md:hidden"
    >
      <Settings className="w-5 h-5" />
    </Link>
  );

  return (
    <ResponsiveLayout headerTitle="Inbox" headerActions={settingsLink}>
      <div className="app-container">
        {/* Filter Bar */}
        <div className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)] md:border-b-0 md:pt-4">
          <div className="p-4 space-y-3 md:max-w-4xl md:mx-auto">
            {/* PC Header */}
            <h1 className="hidden md:block text-2xl font-bold mb-4">Inbox</h1>

            <div className="flex flex-wrap gap-2">
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
              <div className="flex-1 relative md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="検索..."
                  className="w-full pl-9 pr-4 py-2 bg-[var(--secondary)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Sort Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className={cn(
                    "p-2 rounded-lg transition-colors flex items-center gap-1",
                    "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                  title="並び替え"
                >
                  <ArrowUpDown className="w-5 h-5" />
                </button>

                {showSortMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSortMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[140px]">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setSortBy(option.value);
                            setShowSortMenu(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                            sortBy === option.value
                              ? "bg-[var(--primary)] text-white"
                              : "hover:bg-[var(--secondary)]"
                          )}
                        >
                          {option.icon}
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
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
        </div>

        {/* Item List */}
        <div className="p-4 md:max-w-4xl md:mx-auto">
          <ArchiveCandidatesBanner />

          {isLoading ? (
            <div className="space-y-3 md:inbox-grid">
              <SkeletonList count={6} />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              エラーが発生しました
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              アイテムがありません
            </div>
          ) : (
            <div className="space-y-3 md:inbox-grid">
              {sortedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s`, animationFillMode: "both" }}
                >
                  <SwipeableItem onSwipeLeft={() => handleArchive(item.id)}>
                    <ItemCard
                      item={item}
                      onPin={handlePin}
                      onArchive={handleArchive}
                      onClick={setSelectedItem}
                    />
                  </SwipeableItem>
                </div>
              ))}
            </div>
          )}

          {data && data.total > data.items.length && (
            <div className="text-center py-4 text-sm text-[var(--muted-foreground)]">
              {data.items.length} / {data.total} 件を表示
            </div>
          )}
        </div>
      </div>

      <ItemModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={handleUpdate}
        onPin={handlePin}
        onArchive={handleArchive}
      />
    </ResponsiveLayout>
  );
}
