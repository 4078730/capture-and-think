"use client";

import { useState, useRef, type ReactNode, type TouchEvent } from "react";
import { Archive } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableItemProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  threshold?: number;
}

export function SwipeableItem({
  children,
  onSwipeLeft,
  threshold = 80,
}: SwipeableItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const handleTouchStart = (e: TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping) return;

    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;

    // Only allow left swipe (negative values)
    if (diff < 0) {
      // Add resistance as we swipe further
      const resistance = Math.min(Math.abs(diff) / 2, 120);
      setTranslateX(-resistance);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);

    if (Math.abs(translateX) >= threshold) {
      // Animate out and trigger callback
      setTranslateX(-200);
      setTimeout(() => {
        onSwipeLeft?.();
        setTranslateX(0);
      }, 200);
    } else {
      // Spring back
      setTranslateX(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background action indicator */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-[var(--destructive)] transition-opacity",
          Math.abs(translateX) > 20 ? "opacity-100" : "opacity-0"
        )}
        style={{ width: Math.abs(translateX) + 20 }}
      >
        <Archive className="w-6 h-6 text-white" />
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
