"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface MemoEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  maxRows?: number;
}

export function MemoEditor({
  value,
  onChange,
  placeholder = "詳細メモを入力...",
  className,
  minRows = 3,
  maxRows = 10,
}: MemoEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const minHeight = lineHeight * minRows;
    const maxHeight = lineHeight * maxRows;
    const scrollHeight = textarea.scrollHeight;

    textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
  }, [value, minRows, maxRows]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full px-3 py-2 bg-[var(--secondary)] rounded-lg text-sm resize-none",
        "placeholder:text-[var(--muted-foreground)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--primary)]",
        "leading-relaxed",
        className
      )}
      rows={minRows}
    />
  );
}
