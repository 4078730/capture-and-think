"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, Inbox, MessageCircle, Sparkles, Settings, Brain } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ReviewCountResponse {
  total: number;
}

const navItems = [
  { href: "/", label: "Capture", icon: PenLine },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/ask", label: "Ask AI", icon: MessageCircle },
  { href: "/review", label: "Review", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Navigation() {
  const pathname = usePathname();

  // Get review count for badge
  const { data: reviewData } = useQuery<ReviewCountResponse>({
    queryKey: ["review-count"],
    queryFn: async () => {
      const res = await fetch("/api/review");
      if (!res.ok) return { total: 0 };
      const data = await res.json();
      return { total: data.total || 0 };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const reviewCount = reviewData?.total || 0;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 bg-[#09090b]/95 backdrop-blur-2xl border-t border-white/[0.08] md:hidden safe-area-pb">
      <div className="mx-auto flex max-w-xl items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const Icon = item.icon;
          const showBadge = item.href === "/review" && reviewCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 relative",
                active
                  ? "text-white bg-white/[0.08]"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
              )}
              aria-current={active ? "page" : undefined}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", active ? "" : "opacity-80")} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-violet-500 text-[10px] flex items-center justify-center text-white font-bold">
                    {reviewCount > 9 ? "9+" : reviewCount}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// PC Sidebar Navigation - Project/Bucket Selector
export function Sidebar() {
  return null; // Sidebar is now handled in page.tsx
}
