export function SkeletonCard() {
  return (
    <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-4 animate-pulse">
      <div className="flex items-start gap-3">
        {/* Star button skeleton */}
        <div className="w-5 h-5 bg-[var(--secondary)] rounded" />

        <div className="flex-1 space-y-3">
          {/* Body text skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-[var(--secondary)] rounded w-full" />
            <div className="h-4 bg-[var(--secondary)] rounded w-3/4" />
          </div>

          {/* Meta info skeleton */}
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-[var(--secondary)] rounded-full" />
            <div className="h-5 w-20 bg-[var(--secondary)] rounded-full" />
            <div className="h-5 w-12 bg-[var(--secondary)] rounded" />
          </div>
        </div>

        {/* Archive button skeleton */}
        <div className="w-5 h-5 bg-[var(--secondary)] rounded" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
