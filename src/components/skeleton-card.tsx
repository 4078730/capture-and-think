import { cn } from "@/lib/utils";

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={cn("animate-shimmer rounded", className)} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-start gap-3">
        {/* Star button skeleton */}
        <SkeletonBox className="w-5 h-5" />

        <div className="flex-1 space-y-3">
          {/* Body text skeleton */}
          <div className="space-y-2">
            <SkeletonBox className="h-4 w-full" />
            <SkeletonBox className="h-4 w-3/4" />
          </div>

          {/* Meta info skeleton */}
          <div className="flex gap-2">
            <SkeletonBox className="h-5 w-16 rounded-full" />
            <SkeletonBox className="h-5 w-20 rounded-full" />
            <SkeletonBox className="h-5 w-12" />
          </div>
        </div>

        {/* Archive button skeleton */}
        <SkeletonBox className="w-5 h-5" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-in-up"
          style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}
        >
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}
