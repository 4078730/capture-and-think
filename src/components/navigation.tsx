"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, Inbox, MessageCircle, Sparkles, Settings, Brain } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ReviewCountResponse {
  total: number;
}

export function Navigation() {
  // Mobile navigation removed - only Capture page is used
  return null;
}

// PC Sidebar Navigation - Project/Bucket Selector
export function Sidebar() {
  return null; // Sidebar is now handled in page.tsx
}
