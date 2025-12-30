"use client";

import { useEffect, Suspense } from "react";
import { Settings, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ApiKeyManager } from "@/components/api-key-manager";
import { CalendarSettings } from "@/components/calendar-settings";
import { Navigation } from "@/components/navigation";

function SettingsContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("calendar_success") === "true") {
      toast.success("Googleカレンダーを連携しました");
    }
    const error = searchParams.get("calendar_error");
    if (error) {
      const messages: Record<string, string> = {
        auth_denied: "認証がキャンセルされました",
        no_code: "認証コードがありません",
        save_failed: "保存に失敗しました",
        unknown: "エラーが発生しました",
      };
      toast.error(messages[error] || "エラーが発生しました");
    }
  }, [searchParams]);

  return (
    <main className="flex-1 p-4 pb-24 max-w-2xl mx-auto w-full space-y-8">
      <CalendarSettings />
      <hr className="border-[var(--border)]" />
      <ApiKeyManager />
    </main>
  );
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="flex items-center h-14 px-4">
          <Link href="/inbox" className="p-2 -ml-2 hover:bg-[var(--secondary)] rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 flex-1 justify-center mr-8">
            <Settings className="w-5 h-5" />
            <h1 className="text-lg font-semibold">設定</h1>
          </div>
        </div>
      </header>

      <Suspense fallback={
        <main className="flex-1 p-4 pb-24 max-w-2xl mx-auto w-full">
          <div className="text-center text-[var(--muted-foreground)]">読み込み中...</div>
        </main>
      }>
        <SettingsContent />
      </Suspense>

      <Navigation />
    </div>
  );
}
