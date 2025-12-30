import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  if (diffWeek < 4) return `${diffWeek}週間前`;
  if (diffMonth < 12) return `${diffMonth}ヶ月前`;
  return date.toLocaleDateString("ja-JP");
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function getBucketLabel(bucket: string | null): string {
  const labels: Record<string, string> = {
    work: "Work",
    video: "Video",
    life: "Life",
    boardgame: "Boardgame",
  };
  return bucket ? labels[bucket] || bucket : "";
}

export function getBucketColor(bucket: string | null): string {
  const colors: Record<string, string> = {
    work: "bg-blue-500",
    video: "bg-purple-500",
    life: "bg-green-500",
    boardgame: "bg-orange-500",
  };
  return bucket ? colors[bucket] || "bg-gray-500" : "bg-gray-500";
}
