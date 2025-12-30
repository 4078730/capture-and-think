"use client";

import { useEffect, Suspense } from "react";
import { Settings, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ApiKeyManager } from "@/components/api-key-manager";
import { CalendarSettings } from "@/components/calendar-settings";
import { ResponsiveLayout } from "@/components/responsive-layout";

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
    <div className="p-4 md:p-8 max-w-2xl mx-auto w-full space-y-8">
      <CalendarSettings />
      <hr className="border-[var(--border)]" />
      <ApiKeyManager />
    </div>
  );
}

export default function SettingsPage() {
  const backButton = (
    <Link href="/inbox" className="p-2 -ml-2 hover:bg-[var(--secondary)] rounded-lg md:hidden">
      <ChevronLeft className="w-5 h-5" />
    </Link>
  );

  return (
    <ResponsiveLayout headerTitle="" showHeader={false}>
      <div className="app-container">
        {/* Mobile Header */}
        <header className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)] md:hidden">
          <div className="flex items-center h-14 px-4">
            {backButton}
            <div className="flex items-center gap-2 flex-1 justify-center mr-8">
              <Settings className="w-5 h-5" />
              <h1 className="text-lg font-semibold">設定</h1>
            </div>
          </div>
        </header>

        {/* PC Header */}
        <div className="hidden md:block p-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-6 h-6" />
            <h1 className="text-2xl font-bold">設定</h1>
          </div>
        </div>

        <Suspense fallback={
          <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
            <div className="text-center text-[var(--muted-foreground)]">読み込み中...</div>
          </div>
        }>
          <SettingsContent />
        </Suspense>
      </div>
    </ResponsiveLayout>
  );
}
