"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, Star, ChevronDown, Settings, ArrowUpDown, Calendar, Clock, Tag, Hash, Zap, Film, Heart, Gamepad2, Archive, Command, X, Folder, FileText, Briefcase, Check } from "lucide-react";
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
import { useItems, usePinItem, useArchiveItem, useUpdateItem, useCreateItem, useCategories } from "@/hooks/use-items";
import type { ADFDocument } from "@/lib/adf";
import type { Bucket, Item, Subtask } from "@/types";
import { cn, getBucketColor } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "due_date" | "pinned_first" | "bucket";

interface CustomBucket {
  id: string;
  label: string;
  icon: string;
}

export default function HomePage() {
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteBody, setNewNoteBody] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [customBuckets, setCustomBuckets] = useState<CustomBucket[]>([]);
  const [showAddBucketDialog, setShowAddBucketDialog] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");

  // Load custom buckets from localStorage and remove RFM if exists
  useEffect(() => {
    const saved = localStorage.getItem("custom_buckets");
    if (saved) {
      try {
        const buckets = JSON.parse(saved);
        // RFMプロジェクトをフィルタリング
        const filteredBuckets = buckets.filter((cb: CustomBucket) => 
          cb.label.toLowerCase() !== "rfm" && cb.id !== "rfm"
        );
        setCustomBuckets(filteredBuckets);
        // RFMが削除された場合はlocalStorageも更新
        if (filteredBuckets.length !== buckets.length) {
          if (filteredBuckets.length === 0) {
            localStorage.removeItem("custom_buckets");
          } else {
            localStorage.setItem("custom_buckets", JSON.stringify(filteredBuckets));
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save custom buckets to localStorage
  useEffect(() => {
    if (customBuckets.length > 0) {
      localStorage.setItem("custom_buckets", JSON.stringify(customBuckets));
    }
  }, [customBuckets]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categoriesData } = useCategories(bucket);
  const categories = categoriesData?.categories ?? [];

  // Convert custom bucket ID to null for API call (custom buckets don't exist in DB yet)
  const apiBucket = useMemo(() => {
    if (!bucket) return undefined;
    if (typeof bucket === "string" && bucket.startsWith("custom_")) {
      return undefined; // Custom buckets don't filter items yet
    }
    return bucket as Bucket;
  }, [bucket]);

  const { data, isLoading, error } = useItems({
    status: showArchived ? "archived" : "active",
    bucket: apiBucket,
    category: category ?? undefined,
    pinned: pinnedOnly || undefined,
    q: debouncedSearch || undefined,
  });

  const createItem = useCreateItem();
  const pinItem = usePinItem();
  const archiveItem = useArchiveItem();
  const updateItem = useUpdateItem();

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

  // Reset category when bucket changes
  const handleBucketChange = (newBucket: Bucket | null) => {
    setBucket(newBucket);
    setCategory(null);
  };

  const handleCreateNote = useCallback(async () => {
    if (!newNoteBody.trim()) {
      toast.error("メモを入力してください");
      return;
    }

    try {
      const createdItem = await createItem.mutateAsync({
        body: newNoteBody.trim(),
        bucket: bucket ?? undefined,
      });
      
      // 作成されたメモの詳細ビューを開く
      setSelectedItem(createdItem);
      setNewNoteBody("");
      setIsCreating(false);
      toast.success("メモを作成しました");
    } catch (error: any) {
      console.error("Create item error:", error);
      const errorMessage = error?.message || error?.response?.data?.error || "メモの作成に失敗しました";
      // データベース制約エラーの場合、より分かりやすいメッセージを表示
      if (errorMessage.includes("check constraint") || errorMessage.includes("bucket")) {
        toast.error("バケットの値が無効です。データベースのマイグレーションを実行してください。");
      } else {
        toast.error(errorMessage);
      }
    }
  }, [createItem, newNoteBody, bucket]);

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
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
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
      memo?: string | null;
      due_date?: string | null;
      subtasks?: Subtask[];
      summary?: string | null;
      adf_content?: ADFDocument | null;
    }
  ) => {
    const updateData: {
      id: string;
      body?: string;
      bucket?: Bucket | null;
      memo?: string | undefined;
      due_date?: string | null;
      subtasks?: Subtask[];
      summary?: string | null;
      adf_content?: ADFDocument | null;
    } = {
      id,
      body: data.body,
      bucket: data.bucket,
      due_date: data.due_date,
      subtasks: data.subtasks,
      summary: data.summary,
      adf_content: data.adf_content,
    };
    if (data.memo !== null && data.memo !== undefined) {
      updateData.memo = data.memo;
    }
    await updateItem.mutateAsync(updateData);
  };

  const settingsLink = (
    <Link
      href="/settings"
      className="p-2 -mr-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] rounded-lg transition-colors md:hidden"
    >
      <Settings className="w-5 h-5" />
    </Link>
  );

  // Icon mapping for custom buckets
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    hash: Hash,
    zap: Zap,
    film: Film,
    heart: Heart,
    gamepad: Gamepad2,
    tag: Tag,
    folder: Settings,
  };

  // Bucket configuration with icons
  const bucketConfig: Array<{ id: Bucket | string | null; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: null, label: "All", icon: Hash },
    { id: "management", label: "Management", icon: Settings },
    { id: "rfa", label: "RFA", icon: Briefcase },
    { id: "cxc", label: "CXC", icon: Tag },
    { id: "paper", label: "Paper", icon: FileText },
    { id: "video", label: "Video", icon: Film },
    { id: "life", label: "Life", icon: Heart },
    { id: "game", label: "Game", icon: Gamepad2 },
    ...customBuckets.map((cb) => ({
      id: `custom_${cb.id}`,
      label: cb.label,
      icon: iconMap[cb.icon] || Hash,
    })),
  ];

  const handleAddCustomBucket = () => {
    if (newBucketName.trim()) {
      const newBucket: CustomBucket = {
        id: Date.now().toString(),
        label: newBucketName.trim(),
        icon: "hash", // Default icon
      };
      setCustomBuckets([...customBuckets, newBucket]);
      setNewBucketName("");
      setShowAddBucketDialog(false);
      toast.success(`プロジェクト「${newBucketName.trim()}」を追加しました`);
    }
  };

  const handleDeleteCustomBucket = (bucketId: string) => {
    const filteredBuckets = customBuckets.filter((cb) => cb.id !== bucketId);
    setCustomBuckets(filteredBuckets);
    
    // 削除されたプロジェクトが選択されている場合は、選択を解除
    if (bucket === `custom_${bucketId}`) {
      setBucket(null);
    }
    
    // localStorageからも削除
    if (filteredBuckets.length === 0) {
      localStorage.removeItem("custom_buckets");
    } else {
      localStorage.setItem("custom_buckets", JSON.stringify(filteredBuckets));
    }
    
    toast.success("プロジェクトを削除しました");
  };


  // Count items per bucket
  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bucketConfig.forEach(({ id }) => {
      if (id === null) {
        counts["all"] = data?.items?.length ?? 0;
      } else if (typeof id === "string" && id.startsWith("custom_")) {
        // Custom buckets don't have items yet (they're just labels)
        counts[id] = 0;
      } else {
        counts[id as string] = data?.items?.filter(item => item.bucket === id).length ?? 0;
      }
    });
    return counts;
  }, [data?.items, bucketConfig]);

  // Get all tasks from the selected bucket
  const projectTasks = useMemo(() => {
    if (!bucket || !data?.items) return [];
    
    const itemsInBucket = data.items.filter(item => item.bucket === bucket);
    const allTasks: Array<{ id: string; text: string; completed: boolean; itemId: string; itemTitle: string; created_at: string; item: Item }> = [];
    
    itemsInBucket.forEach(item => {
      if (item.subtasks && item.subtasks.length > 0) {
        item.subtasks.forEach(subtask => {
          allTasks.push({
            id: subtask.id,
            text: subtask.text,
            completed: subtask.completed,
            itemId: item.id,
            itemTitle: item.summary || item.body.substring(0, 30) || "Untitled",
            created_at: subtask.created_at,
            item: item,
          });
        });
      }
    });
    
    return allTasks;
  }, [bucket, data?.items]);

  // Handle task toggle from project tasks list
  const handleToggleProjectTask = useCallback(async (task: typeof projectTasks[0]) => {
    const item = task.item;
    if (!item) return;

    const updatedSubtasks = item.subtasks.map(st =>
      st.id === task.id ? { ...st, completed: !st.completed } : st
    );

    try {
      await handleUpdate(item.id, { subtasks: updatedSubtasks });
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("タスクの更新に失敗しました");
    }
  }, [handleUpdate]);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-violet-500/30">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f12] to-[#0a0a0b]" />
      </div>
      
      {/* Sidebar - Project/Bucket Selector */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/[0.08] hidden lg:flex flex-col z-30 bg-[#09090b]/90 backdrop-blur-2xl">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0 border-b border-white/[0.08]">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Star className="w-4 h-4 text-white" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 blur-lg opacity-40" />
          </div>
          <div>
            <span className="font-bold text-[16px] tracking-tight text-white">Capture</span>
            <p className="text-[10px] text-white/30 -mt-0.5">AI-powered notes</p>
          </div>
        </div>

        {/* Bucket Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          <div className="space-y-1">
            {bucketConfig.map(({ id, label, icon: Icon }) => {
              const count = id === null ? bucketCounts["all"] : bucketCounts[id] ?? 0;
              const isActive = bucket === id;
              const isCustom = typeof id === "string" && id.startsWith("custom_");
              const customBucketId = isCustom ? id.replace("custom_", "") : null;
              return (
                <div
                  key={id || "all"}
                  className="group relative"
                >
                  <button
                    onClick={() => setBucket(id as Bucket | null)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200",
                      isActive
                        ? "bg-white/[0.08] text-white shadow-sm border-2 border-dashed border-violet-500/50"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                    )}
                    style={{ minHeight: "36px" }}
                  >
                    <Icon className={cn("w-4 h-4 transition-colors flex-shrink-0", isActive ? "text-violet-400" : "text-white/30")} />
                    <span className="flex-1 text-left truncate">{label}</span>
                    <span className={cn(
                      "text-[11px] tabular-nums px-1.5 py-0.5 rounded transition-colors flex-shrink-0",
                      isActive ? "bg-white/10 text-white/70" : "text-white/20"
                    )}>{count}</span>
                  </button>
                  {isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`プロジェクト「${label}」を削除しますか？\nこのプロジェクトに紐づくメモは削除されませんが、プロジェクトフィルターからは除外されます。`)) {
                          handleDeleteCustomBucket(customBucketId!);
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 group-hover:opacity-100 p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                      title="プロジェクトを削除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Add Custom Bucket Button */}
          <button
            onClick={() => setShowAddBucketDialog(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-all duration-200 mt-2 border border-dashed border-white/[0.08] hover:border-white/[0.15]"
            style={{ minHeight: "36px" }}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">プロジェクトを追加</span>
          </button>

        </nav>
      </aside>

      {/* Add Bucket Dialog */}
      {showAddBucketDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#09090b] border border-white/[0.08] rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">新しいプロジェクトを追加</h3>
            <input
              type="text"
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddCustomBucket();
                }
                if (e.key === "Escape") {
                  setShowAddBucketDialog(false);
                  setNewBucketName("");
                }
              }}
              placeholder="プロジェクト名を入力..."
              className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddBucketDialog(false);
                  setNewBucketName("");
                }}
                className="px-4 py-2 bg-white/[0.02] border border-white/[0.08] text-white/70 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddCustomBucket}
                disabled={!newBucketName.trim()}
                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-lg hover:from-violet-400 hover:to-fuchsia-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ResponsiveLayout headerTitle="Capture" headerActions={settingsLink}>
        <div className="flex h-[calc(100vh-4rem)] md:h-screen md:flex-row flex-col relative z-10 lg:ml-64">
        {/* PC: 3カラムレイアウト、モバイル: 縦並び */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full">
          {/* Left Panel: Capture Form & Notes List - Always visible on PC */}
          <div className={cn(
            "flex flex-col overflow-hidden border-r border-white/[0.08]",
            "w-full md:w-96 md:flex-shrink-0 md:flex-grow-0"
          )}>
            {/* Header */}
            <div className="p-4 border-b border-white/[0.08] bg-[#09090b]/90">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white">Capture</h2>
                {!isCreating && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        // 空のメモを作成して詳細ビューを開く
                        const createdItem = await createItem.mutateAsync({
                          body: "",
                          bucket: bucket ?? undefined,
                        });
                        setSelectedItem(createdItem);
                        toast.success("新しいメモを作成しました");
                      } catch (error: any) {
                        console.error("Create item error:", error);
                        let errorMessage = "メモの作成に失敗しました";
                        
                        // エラーメッセージの抽出を改善
                        if (error?.response?.data?.error) {
                          const errorData = error.response.data.error;
                          if (typeof errorData === 'string') {
                            errorMessage = errorData;
                          } else if (Array.isArray(errorData)) {
                            errorMessage = errorData.map((e: any) => 
                              typeof e === 'string' ? e : e.message || JSON.stringify(e)
                            ).join(', ');
                          } else if (typeof errorData === 'object') {
                            errorMessage = errorData.message || JSON.stringify(errorData);
                          }
                        } else if (error?.message) {
                          errorMessage = error.message;
                        }
                        
                        if (errorMessage.includes("check constraint") || errorMessage.includes("bucket")) {
                          toast.error("バケットの値が無効です。データベースのマイグレーションを実行してください。");
                        } else {
                          toast.error(errorMessage);
                        }
                      }
                    }}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-105 active:scale-95 flex items-center justify-center"
                    title="新しいメモを作成"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {/* Bucket Selection */}
              <div className="flex flex-wrap gap-2 mb-3 overflow-x-auto">
                {bucketConfig
                  .filter(({ id }) => id !== null) // "All"を除外（サイドバーで管理）
                  .map(({ id, label }) => {
                    const isActive = bucket === id;
                    const count = bucketCounts[id as string] ?? 0;
                    return (
                      <button
                        key={id || "all"}
                        type="button"
                        onClick={() => handleBucketChange(id as Bucket | null)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
                          isActive
                            ? "bg-white/[0.08] text-white"
                            : "bg-white/[0.02] text-white/50 hover:bg-white/[0.04] hover:text-white/70"
                        )}
                      >
                        <span>{label}</span>
                        {count > 0 && (
                          <span className="text-[10px] opacity-60">({count})</span>
                        )}
                      </button>
                    );
                  })}
                {categories.length > 0 && (
                  <div className="relative">
                    <select
                      value={category ?? ""}
                      onChange={(e) => setCategory(e.target.value || null)}
                      className="appearance-none h-8 pl-3 pr-8 bg-[#18181b] border border-white/[0.08] rounded-lg text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="" className="bg-[#18181b] text-white/90">全カテゴリ</option>
                      {categories.map((cat) => (
                        <option key={cat.name} value={cat.name} className="bg-[#18181b] text-white/90">
                          {cat.name} ({cat.count})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white/30" />
                  </div>
                )}
              </div>

              {/* Search and Filter Bar */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="検索..."
                    className="w-full pl-9 pr-4 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                  />
                </div>

                {/* Sort Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className={cn(
                      "p-2 rounded-lg transition-colors flex items-center gap-1",
                      "bg-white/[0.02] border border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
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
                      <div className="absolute right-0 top-full mt-1 z-20 bg-[#09090b] border border-white/[0.08] rounded-lg shadow-lg py-1 min-w-[140px]">
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
                                ? "bg-violet-500/20 text-violet-400"
                                : "hover:bg-white/[0.04] text-white/70"
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
                    "p-2 rounded-lg transition-colors border border-white/[0.08]",
                    pinnedOnly
                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      : "bg-white/[0.02] text-white/50 hover:text-yellow-400 hover:bg-white/[0.04]"
                  )}
                >
                  <Star className={cn("w-5 h-5", pinnedOnly && "fill-current")} />
                </button>
              </div>
            </div>



            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0b]">
              <ArchiveCandidatesBanner />

              {/* Project Tasks List - Show when bucket is selected */}
              {bucket && projectTasks.length > 0 && (
                <div className="mb-6 pb-6 border-b border-white/[0.08]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                      <Check className="w-4 h-4 text-violet-400" />
                      プロジェクトタスク
                    </h3>
                    <span className="text-xs text-white/40 bg-white/[0.05] px-2 py-1 rounded">
                      {projectTasks.filter(t => !t.completed).length} / {projectTasks.length}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {projectTasks
                      .filter(task => !task.completed)
                      .map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] group"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleProjectTask(task);
                            }}
                            className="w-4 h-4 rounded border-2 border-white/20 hover:border-violet-400 flex-shrink-0 flex items-center justify-center transition-all"
                          >
                            {task.completed && (
                              <Check className="w-2.5 h-2.5 text-violet-400" strokeWidth={3} />
                            )}
                          </button>
                          <span
                            className="text-xs text-white/70 flex-1 line-clamp-1 cursor-pointer"
                            onClick={() => {
                              const item = data?.items?.find(i => i.id === task.itemId);
                              if (item) setSelectedItem(item);
                            }}
                          >
                            {task.text}
                          </span>
                          <span
                            className="text-[10px] text-white/30 flex-shrink-0 truncate max-w-[100px] cursor-pointer"
                            onClick={() => {
                              const item = data?.items?.find(i => i.id === task.itemId);
                              if (item) setSelectedItem(item);
                            }}
                          >
                            {task.itemTitle}
                          </span>
                        </div>
                      ))}
                    {projectTasks.filter(t => t.completed).length > 0 && (
                      <div className="pt-2 mt-2 border-t border-white/[0.06]">
                        <p className="text-[10px] text-white/20 mb-1.5 uppercase">Completed</p>
                        {projectTasks
                          .filter(t => t.completed)
                          .slice(0, 3)
                          .map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 py-1 px-2 rounded text-[10px] text-white/25 group"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleProjectTask(task);
                                }}
                                className="w-3.5 h-3.5 rounded bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 hover:bg-violet-500/30 transition-all"
                              >
                                <Check className="w-2 h-2 text-violet-400" strokeWidth={3} />
                              </button>
                              <span
                                className="flex-1 truncate line-through cursor-pointer"
                                onClick={() => {
                                  const item = data?.items?.find(i => i.id === task.itemId);
                                  if (item) setSelectedItem(item);
                                }}
                              >
                                {task.text}
                              </span>
                            </div>
                          ))}
                        {projectTasks.filter(t => t.completed).length > 3 && (
                          <p className="text-[10px] text-white/20 mt-1">
                            +{projectTasks.filter(t => t.completed).length - 3} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="space-y-3">
                  <SkeletonList count={6} />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-white/50">
                  エラーが発生しました
                </div>
              ) : sortedItems.length === 0 ? (
                <div className="text-center py-12 text-white/50">
                  アイテムがありません
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        "animate-fade-in-up cursor-pointer",
                        selectedItem?.id === item.id && "ring-2 ring-violet-500/50 rounded-lg"
                      )}
                      style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s`, animationFillMode: "both" }}
                      onClick={() => setSelectedItem(item)}
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

              {data && data.total && data.items && data.total > data.items.length && (
                <div className="text-center py-4 text-sm text-white/50">
                  {data.items.length} / {data.total} 件を表示
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Detail View (PC only) - Always visible on PC */}
          <div className="hidden md:flex flex-1 min-w-0 overflow-hidden bg-[#0a0a0b]">
            {selectedItem ? (
              <NoteDetailView
                key={selectedItem.id}
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onUpdate={async (updates) => {
                  if (selectedItem) {
                    await handleUpdate(selectedItem.id, updates);
                    // Refresh selected item from the latest data
                    const updated = { ...selectedItem, ...updates };
                    setSelectedItem(updated as Item);
                  }
                }}
                onDelete={async () => {
                  if (selectedItem) {
                    await handleArchive(selectedItem.id);
                  }
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/30">
                <p className="text-sm">ノートを選択してください</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Modal */}
      {isMobile && (
        <ItemModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleUpdate}
          onPin={handlePin}
          onArchive={handleArchive}
        />
      )}
      </ResponsiveLayout>
    </div>
  );
}
