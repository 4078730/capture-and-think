"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { ADFDocument } from "@/lib/adf";
import { adfToPlainText, plainTextToADF } from "@/lib/adf";

// ============================================
// Types
// ============================================

export interface RichEditorProps {
  value: ADFDocument | null;
  onChange: (doc: ADFDocument, plainText: string) => void;
  onTextSelect?: (text: string, range: Range) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onImageClick?: (url: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

// ============================================
// Helpers
// ============================================

function htmlToMarkdown(element: HTMLElement): string {
  let content = "";

  const processNode = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      content += node.textContent;
    } else if (node.nodeName === "IMG") {
      const img = node as HTMLImageElement;
      content += `![${img.alt || "image"}](${img.src})`;
    } else if (node.nodeName === "BR") {
      content += "\n";
    } else if (node.nodeName === "DIV" || node.nodeName === "P") {
      if (content && !content.endsWith("\n")) content += "\n";
      node.childNodes.forEach(processNode);
    } else if (node.nodeName === "A") {
      const a = node as HTMLAnchorElement;
      content += `[${a.textContent || a.href}](${a.href})`;
    } else if (node.nodeName === "STRONG" || node.nodeName === "B") {
      content += "**";
      node.childNodes.forEach(processNode);
      content += "**";
    } else if (node.nodeName === "EM" || node.nodeName === "I") {
      content += "_";
      node.childNodes.forEach(processNode);
      content += "_";
    } else if (node.nodeName === "CODE") {
      content += "`";
      node.childNodes.forEach(processNode);
      content += "`";
    } else {
      node.childNodes.forEach(processNode);
    }
  };

  element.childNodes.forEach(processNode);
  return content.replace(/^\n/, "");
}

function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  let html = markdown;

  // Images: ![alt](url)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="inline-image" />'
  );

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-link">$1</a>'
  );

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: _text_
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Code: `text`
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");

  // Line breaks
  html = html.replace(/\n/g, "<br />");

  return html;
}

// ============================================
// Component
// ============================================

export function RichEditor({
  value,
  onChange,
  onTextSelect,
  onImageUpload,
  onImageClick,
  placeholder = "Start writing...",
  className,
  readOnly = false,
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const plainText = value ? adfToPlainText(value) : "";
      const html = markdownToHtml(plainText);
      editorRef.current.innerHTML = html;

      // Add click handlers to images
      const images = editorRef.current.querySelectorAll("img");
      images.forEach((img) => {
        img.onclick = (e) => {
          e.stopPropagation();
          onImageClick?.(img.src);
        };
      });
    }
    isInternalChange.current = false;
  }, [value, onImageClick]);

  // Handle input changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    isInternalChange.current = true;
    const markdown = htmlToMarkdown(editorRef.current);
    const adfDoc = plainTextToADF(markdown);
    onChange(adfDoc, markdown);
  }, [onChange]);

  // Handle paste (including images)
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;

          // If we have an upload handler, use it; otherwise use data URL
          let imageUrl: string;
          if (onImageUpload) {
            try {
              imageUrl = await onImageUpload(file);
            } catch (error) {
              console.error("Failed to upload image:", error);
              return;
            }
          } else {
            // Fallback to data URL
            imageUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (event) => resolve(event.target?.result as string);
              reader.readAsDataURL(file);
            });
          }

          // Insert image at cursor
          insertImageAtCursor(imageUrl, onImageClick);
          handleInput();
          return;
        }
      }
    },
    [onImageUpload, onImageClick, handleInput]
  );

  // Insert image at current cursor position
  const insertImageAtCursor = (url: string, clickHandler?: (url: string) => void) => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = `Image ${new Date().toLocaleTimeString("ja-JP")}`;
    img.className =
      "max-w-full max-h-[300px] rounded-lg border border-white/[0.08] inline-block my-2 cursor-pointer";
    img.onclick = (e) => {
      e.stopPropagation();
      clickHandler?.(url);
    };

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else if (editorRef.current) {
      editorRef.current.appendChild(img);
    }
  };

  // Handle text selection
  const handleSelection = useCallback(() => {
    if (!onTextSelect) return;

    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      const range = sel.getRangeAt(0);
      onTextSelect(sel.toString().trim(), range);
    }
  }, [onTextSelect]);

  // Public method to insert image
  const insertImage = useCallback(
    (url: string, alt?: string) => {
      if (!editorRef.current) return;

      const img = document.createElement("img");
      img.src = url;
      img.alt = alt || "Image";
      img.className =
        "max-w-full max-h-[300px] rounded-lg border border-white/[0.08] inline-block my-2 cursor-pointer";
      img.onclick = (e) => {
        e.stopPropagation();
        onImageClick?.(url);
      };

      // Insert at cursor or append
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editorRef.current.appendChild(img);
      }

      handleInput();
    },
    [onImageClick, handleInput]
  );

  // Public method to insert link
  const insertLink = useCallback(
    (url: string, text?: string) => {
      if (!editorRef.current) return;

      const linkText = text || url;
      const sel = window.getSelection();

      if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "text-blue-400 hover:text-blue-300 underline";
        a.textContent = sel.toString() || linkText;
        a.onclick = (e) => e.stopPropagation();

        range.deleteContents();
        range.insertNode(a);
        range.setStartAfter(a);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        // Append at the end
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "text-blue-400 hover:text-blue-300 underline";
        a.textContent = linkText;
        a.onclick = (e) => e.stopPropagation();
        editorRef.current.appendChild(a);
      }

      handleInput();
    },
    [handleInput]
  );

  // Expose methods via ref
  useEffect(() => {
    if (editorRef.current) {
      (editorRef.current as HTMLDivElement & { insertImage?: typeof insertImage; insertLink?: typeof insertLink }).insertImage = insertImage;
      (editorRef.current as HTMLDivElement & { insertImage?: typeof insertImage; insertLink?: typeof insertLink }).insertLink = insertLink;
    }
  }, [insertImage, insertLink]);

  return (
    <div
      ref={editorRef}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      className={cn(
        "min-h-[200px] text-white/80 text-[16px] leading-[1.9] outline-none whitespace-pre-wrap",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-white/20",
        "[&_.inline-image]:max-w-full [&_.inline-image]:max-h-[300px] [&_.inline-image]:rounded-lg [&_.inline-image]:border [&_.inline-image]:border-white/[0.08] [&_.inline-image]:inline-block [&_.inline-image]:my-2 [&_.inline-image]:cursor-pointer",
        "[&_.inline-link]:text-blue-400 [&_.inline-link]:hover:text-blue-300 [&_.inline-link]:underline",
        "[&_code]:px-1.5 [&_code]:py-0.5 [&_code]:bg-white/[0.08] [&_code]:rounded [&_code]:text-[14px] [&_code]:text-violet-300 [&_code]:font-mono",
        className
      )}
      style={{ wordBreak: "break-word" }}
      data-placeholder={placeholder}
      onInput={handleInput}
      onPaste={handlePaste}
      onMouseUp={handleSelection}
      onKeyUp={handleSelection}
    />
  );
}

export default RichEditor;
