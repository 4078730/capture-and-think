"use client";

import { useQuery } from "@tanstack/react-query";

interface VersionInfo {
  version: string;
  commit: string;
  branch: string;
  deployedAt: string;
}

export function VersionFooter() {
  const { data } = useQuery<VersionInfo>({
    queryKey: ["version"],
    queryFn: async () => {
      const res = await fetch("/api/version");
      return res.json();
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  if (!data) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="fixed bottom-20 left-0 right-0 flex justify-center pointer-events-none">
      <span className="text-[10px] text-[var(--muted-foreground)] opacity-40">
        v{data.version} ({data.commit}) - {formatDate(data.deployedAt)}
      </span>
    </div>
  );
}
