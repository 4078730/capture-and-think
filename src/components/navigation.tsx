"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, Inbox, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Capture", icon: PenLine },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/ask", label: "Ask", icon: MessageCircle },
];

export function Navigation() {
  const pathname = usePathname();

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
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
