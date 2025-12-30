"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, Inbox, MessageCircle, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ReviewCountResponse {
  total: number;
}

export function Navigation() {
  const pathname = usePathname();

  // Fetch pending review count
  const { data: reviewData } = useQuery<ReviewCountResponse>({
    queryKey: ["review-count"],
    queryFn: async () => {
      const res = await fetch("/api/review?limit=0");
      if (!res.ok) return { total: 0 };
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  });

  const reviewCount = reviewData?.total ?? 0;

  const navItems = [
    { href: "/", label: "Capture", icon: PenLine, badge: 0 },
    { href: "/review", label: "Review", icon: Sparkles, badge: reviewCount },
    { href: "/inbox", label: "Inbox", icon: Inbox, badge: 0 },
    { href: "/ask", label: "Ask", icon: MessageCircle, badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--background)] border-t border-[var(--border)] safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors relative",
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-purple-500 text-white text-[10px] font-bold">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
