"use client";

import { useState } from "react";
import { Archive, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useArchiveCandidates, useBulkArchive } from "@/hooks/use-items";
import { formatRelativeTime, truncateText } from "@/lib/utils";

export function ArchiveCandidatesBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { data, isLoading } = useArchiveCandidates();
  const bulkArchive = useBulkArchive();

  if (isLoading || isDismissed || !data || data.total === 0) {
    return null;
  }

  const handleArchiveAll = async () => {
    if (!confirm(`${data.total}件のアイテムをアーカイブしますか？`)) return;

    try {
      await bulkArchive.mutateAsync(data.items.map((item) => item.id));
      toast.success(`${data.total}件をアーカイブしました`);
    } catch {
      toast.error("アーカイブに失敗しました");
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg overflow-hidden mb-4">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-medium text-white/90">
            {data.total}件の古いアイテムがあります
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white/[0.05] rounded transition-colors text-white/50 hover:text-white/70"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 hover:bg-white/[0.05] rounded transition-colors text-white/50 hover:text-white/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-amber-500/30">
          <div className="max-h-48 overflow-y-auto">
            {data.items.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="px-3 py-2 border-b border-white/[0.08] last:border-b-0 hover:bg-white/[0.02]"
              >
                <p className="text-sm text-white/90 truncate">
                  {truncateText(item.body, 60)}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {formatRelativeTime(item.created_at)}
                </p>
              </div>
            ))}
            {data.total > 10 && (
              <div className="px-3 py-2 text-center text-xs text-white/40">
                他 {data.total - 10}件
              </div>
            )}
          </div>

          <div className="p-3 border-t border-amber-500/30">
            <button
              type="button"
              onClick={handleArchiveAll}
              disabled={bulkArchive.isPending}
              className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {bulkArchive.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              すべてアーカイブ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
