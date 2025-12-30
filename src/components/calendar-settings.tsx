"use client";

import { useState } from "react";
import { Calendar, Check, RefreshCw, Unlink, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface CalendarSettingsResponse {
  connected: boolean;
  enabled: boolean;
  selectedCalendarId: string | null;
  calendars: { id: string; summary: string }[];
}

export function CalendarSettings() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const { data, isLoading } = useQuery<CalendarSettingsResponse>({
    queryKey: ["calendar-settings"],
    queryFn: async () => {
      const res = await fetch("/api/calendar/settings");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (settings: { google_calendar_enabled?: boolean; google_calendar_id?: string }) => {
      const res = await fetch("/api/calendar/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-settings"] });
      toast.success("設定を保存しました");
    },
    onError: () => {
      toast.error("保存に失敗しました");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calendar/settings", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-settings"] });
      toast.success("連携を解除しました");
    },
    onError: () => {
      toast.error("解除に失敗しました");
    },
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      const result = await res.json();
      if (res.ok) {
        toast.success(`同期完了: ${result.created}件作成, ${result.updated}件更新`);
      } else {
        toast.error("同期に失敗しました");
      }
    } catch {
      toast.error("同期に失敗しました");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--muted-foreground)]" />
          <h2 className="text-lg font-semibold">Googleカレンダー</h2>
        </div>
        <div className="text-sm text-[var(--muted-foreground)]">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-[var(--muted-foreground)]" />
        <h2 className="text-lg font-semibold">Googleカレンダー</h2>
      </div>

      <p className="text-sm text-[var(--muted-foreground)]">
        期限付きアイテムをGoogleカレンダーに同期します。
      </p>

      {!data?.connected ? (
        <a
          href="/api/calendar/auth"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <ExternalLink className="w-4 h-4" />
          Googleカレンダーを連携
        </a>
      ) : (
        <div className="space-y-4">
          {/* Connected status */}
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Check className="w-4 h-4" />
            <span className="text-sm">連携済み</span>
          </div>

          {/* Calendar selector */}
          <div>
            <label className="block text-sm text-[var(--muted-foreground)] mb-1">
              同期先カレンダー
            </label>
            <select
              value={data.selectedCalendarId ?? ""}
              onChange={(e) => updateMutation.mutate({ google_calendar_id: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--secondary)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">選択してください</option>
              {data.calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.summary}
                </option>
              ))}
            </select>
          </div>

          {/* Enable toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                data.enabled ? "bg-[var(--primary)]" : "bg-[var(--secondary)]"
              )}
            >
              <input
                type="checkbox"
                checked={data.enabled}
                onChange={(e) => updateMutation.mutate({ google_calendar_enabled: e.target.checked })}
                className="sr-only"
              />
              <div
                className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                  data.enabled ? "translate-x-5.5 left-0.5" : "left-0.5"
                )}
                style={{ transform: data.enabled ? "translateX(22px)" : "translateX(0)" }}
              />
            </div>
            <span className="text-sm">自動同期を有効にする</span>
          </label>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing || !data.selectedCalendarId}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--secondary)] rounded-lg text-sm font-medium hover:bg-[var(--secondary)]/80 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              今すぐ同期
            </button>

            <button
              type="button"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Unlink className="w-4 h-4" />
              連携解除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
