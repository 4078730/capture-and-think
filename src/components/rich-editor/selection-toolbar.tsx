"use client";

import { Check, Sparkles, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

export interface SelectionToolbarProps {
  selectedText: string;
  onCreateTask?: (text: string) => void;
  onAskAI?: (text: string) => void;
  onSetDue?: (text: string) => void;
  onClose: () => void;
  className?: string;
}

// ============================================
// Component
// ============================================

export function SelectionToolbar({
  selectedText,
  onCreateTask,
  onAskAI,
  onSetDue,
  onClose,
  className,
}: SelectionToolbarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-50",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        className
      )}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full" />

      <div className="relative flex items-center gap-1.5 p-1.5 bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60">
        {onCreateTask && (
          <button
            onClick={() => onCreateTask(selectedText)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white text-[13px] font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25"
          >
            <Check className="w-4 h-4" />
            Create task
          </button>
        )}

        {onAskAI && (
          <button
            onClick={() => onAskAI(selectedText)}
            className="flex items-center gap-2 px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/[0.08] text-[13px] font-medium rounded-xl transition-all duration-200"
          >
            <Sparkles className="w-4 h-4" />
            Ask AI
          </button>
        )}

        {onSetDue && (
          <button
            onClick={() => onSetDue(selectedText)}
            className="flex items-center gap-2 px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/[0.08] text-[13px] font-medium rounded-xl transition-all duration-200"
          >
            <Calendar className="w-4 h-4" />
            Set due
          </button>
        )}

        <div className="w-px h-6 bg-white/[0.08] mx-1" />

        <button
          onClick={onClose}
          className="p-2.5 text-white/30 hover:text-white/60 hover:bg-white/[0.06] rounded-xl transition-all duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default SelectionToolbar;
