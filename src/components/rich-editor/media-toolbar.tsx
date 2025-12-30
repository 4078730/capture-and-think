"use client";

import { useRef, useState } from "react";
import { Upload, Image, Link2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

export interface MediaToolbarProps {
  onFileSelect: (file: File) => void;
  onImageUrl: (url: string, title?: string) => void;
  onLinkAdd: (url: string, title?: string) => void;
  className?: string;
}

interface MediaModalState {
  type: "image" | "link";
  url: string;
  title: string;
}

// ============================================
// Component
// ============================================

export function MediaToolbar({
  onFileSelect,
  onImageUrl,
  onLinkAdd,
  className,
}: MediaToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState<MediaModalState | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleModalSubmit = () => {
    if (!modal || !modal.url) return;

    if (modal.type === "image") {
      onImageUrl(modal.url, modal.title || undefined);
    } else {
      onLinkAdd(modal.url, modal.title || undefined);
    }
    setModal(null);
  };

  return (
    <>
      <div
        className={cn(
          "sticky bottom-4 mt-8",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inline-flex items-center gap-1 p-1.5 bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-xl">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          <button
            onClick={() => setModal({ type: "image", url: "", title: "" })}
            className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all"
          >
            <Image className="w-4 h-4" />
            <span className="hidden sm:inline">URL</span>
          </button>

          <button
            onClick={() => setModal({ type: "link", url: "", title: "" })}
            className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all"
          >
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Link</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Media Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-md bg-[#141417] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-[16px] font-semibold text-white/90 flex items-center gap-2">
                {modal.type === "image" ? (
                  <Image className="w-5 h-5 text-violet-400" />
                ) : (
                  <Link2 className="w-5 h-5 text-violet-400" />
                )}
                {modal.type === "image" ? "Add Image URL" : "Add Link"}
              </h3>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] text-white/40 mb-2">URL</label>
                <input
                  type="url"
                  value={modal.url}
                  onChange={(e) => setModal({ ...modal, url: e.target.value })}
                  placeholder={
                    modal.type === "image"
                      ? "https://example.com/image.jpg"
                      : "https://example.com"
                  }
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] focus:border-violet-500/50 rounded-xl text-[14px] text-white/90 placeholder:text-white/20 outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[12px] text-white/40 mb-2">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={modal.title}
                  onChange={(e) => setModal({ ...modal, title: e.target.value })}
                  placeholder="Description or link text"
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] focus:border-violet-500/50 rounded-xl text-[14px] text-white/90 placeholder:text-white/20 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={!modal.url}
                className="px-4 py-2 bg-violet-500 hover:bg-violet-400 disabled:bg-white/[0.04] disabled:text-white/20 text-white text-[13px] font-medium rounded-lg transition-all"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MediaToolbar;
