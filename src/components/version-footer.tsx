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

  return (
    <div className="fixed bottom-20 left-0 right-0 flex justify-center pointer-events-none">
      <span className="text-[10px] text-[var(--muted-foreground)] opacity-40">
        v{data.version} ({data.commit})
      </span>
    </div>
  );
}
