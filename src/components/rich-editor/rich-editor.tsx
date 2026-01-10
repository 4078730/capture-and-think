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
    } else if (node.nodeName === "CODE" && (node as HTMLElement).parentElement?.nodeName !== "PRE") {
      content += "`";
      node.childNodes.forEach(processNode);
      content += "`";
    } else if (node.nodeName === "PRE") {
      if (content && !content.endsWith("\n")) content += "\n";
      content += "```\n";
      const codeEl = (node as HTMLElement).querySelector("code");
      if (codeEl) {
        content += codeEl.textContent || "";
      } else {
        content += (node as HTMLElement).textContent || "";
      }
      if (!content.endsWith("\n")) content += "\n";
      content += "```\n";
    } else if (node.nodeName.match(/^H[1-6]$/)) {
      if (content && !content.endsWith("\n")) content += "\n";
      const level = parseInt(node.nodeName[1]);
      content += "#".repeat(level) + " ";
      node.childNodes.forEach(processNode);
      content += "\n";
    } else if (node.nodeName === "UL" || node.nodeName === "OL") {
      if (content && !content.endsWith("\n")) content += "\n";
      const listItems = (node as HTMLElement).querySelectorAll(":scope > li");
      listItems.forEach((li, index) => {
        const prefix = node.nodeName === "OL" ? `${index + 1}. ` : "- ";
        content += prefix + (li.textContent || "") + "\n";
      });
    } else if (node.nodeName === "BLOCKQUOTE") {
      if (content && !content.endsWith("\n")) content += "\n";
      const lines = ((node as HTMLElement).textContent || "").split("\n");
      lines.forEach((line) => {
        content += "> " + line + "\n";
      });
    } else if (node.nodeName === "HR") {
      if (content && !content.endsWith("\n")) content += "\n";
      content += "---\n";
    } else if (node.nodeName === "DETAILS") {
      if (content && !content.endsWith("\n")) content += "\n";
      const summary = (node as HTMLElement).querySelector("summary");
      const summaryText = summary?.textContent || "Details";
      content += `<details>\n<summary>${summaryText}</summary>\n\n`;
      const detailsContent = (node as HTMLElement).cloneNode(true) as HTMLElement;
      detailsContent.querySelector("summary")?.remove();
      content += detailsContent.textContent || "";
      if (!content.endsWith("\n")) content += "\n";
      content += "\n</details>\n";
    } else {
      node.childNodes.forEach(processNode);
    }
  };

  element.childNodes.forEach(processNode);
  return content.replace(/^\n/, "");
}

function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let inDetails = false;
  let detailsSummary = "";
  let detailsContent: string[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      const tag = listType === "ol" ? "ol" : "ul";
      result.push(`<${tag} class="markdown-list">${listItems.map((item) => `<li>${item}</li>`).join("")}</${tag}>`);
      listItems = [];
      inList = false;
      listType = null;
    }
  };

  const flushDetails = () => {
    if (inDetails) {
      result.push(`<details class="markdown-details"><summary class="markdown-summary">${detailsSummary}</summary><div class="markdown-details-content">${detailsContent.join("<br />")}</div></details>`);
      detailsSummary = "";
      detailsContent = [];
      inDetails = false;
    }
  };

  const processInline = (text: string): string => {
    let processed = text;

    processed = processed.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="inline-image" />'
    );

    processed = processed.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-link">$1</a>'
    );

    processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    processed = processed.replace(/__(.+?)__/g, "<strong>$1</strong>");
    processed = processed.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
    processed = processed.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>");
    processed = processed.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    return processed;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        const codeHtml = `<pre class="code-block"><code>${codeBlockContent.join("\n")}</code></pre>`;
        if (inDetails) {
          detailsContent.push(codeHtml);
        } else {
          result.push(codeHtml);
        }
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
      continue;
    }

    if (line === "<details>" || line.match(/^<details\s*>$/i)) {
      flushList();
      flushDetails();
      inDetails = true;
      continue;
    }

    if (inDetails && line.match(/^<summary>(.+)<\/summary>$/i)) {
      const match = line.match(/^<summary>(.+)<\/summary>$/i);
      detailsSummary = match ? processInline(match[1]) : "Details";
      continue;
    }

    if (line === "</details>" || line.match(/^<\/details\s*>$/i)) {
      flushDetails();
      continue;
    }

    if (inDetails) {
      if (line.trim() === "") {
        detailsContent.push("<br />");
      } else {
        detailsContent.push(processInline(line));
      }
      continue;
    }

    if (line.match(/^#{1,6}\s/)) {
      flushList();
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const content = processInline(match[2]);
        result.push(`<h${level} class="markdown-h${level}">${content}</h${level}>`);
      }
      continue;
    }

    if (line.match(/^[-*]\s/)) {
      if (!inList || listType !== "ul") {
        flushList();
        inList = true;
        listType = "ul";
      }
      listItems.push(processInline(line.replace(/^[-*]\s/, "")));
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      if (!inList || listType !== "ol") {
        flushList();
        inList = true;
        listType = "ol";
      }
      listItems.push(processInline(line.replace(/^\d+\.\s/, "")));
      continue;
    }

    if (line.startsWith("> ")) {
      flushList();
      result.push(`<blockquote class="markdown-blockquote">${processInline(line.slice(2))}</blockquote>`);
      continue;
    }

    if (line.match(/^[-*_]{3,}$/)) {
      flushList();
      result.push('<hr class="markdown-hr" />');
      continue;
    }

    flushList();

    if (line.trim() === "") {
      result.push("<br />");
    } else {
      result.push(processInline(line));
    }
  }

  flushList();
  flushDetails();

  if (inCodeBlock && codeBlockContent.length > 0) {
    result.push(`<pre class="code-block"><code>${codeBlockContent.join("\n")}</code></pre>`);
  }

  return result.join("<br />");
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!editorRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);

      if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          const node = range.startContainer;
          if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            const text = node.textContent;
            const lineStart = text.lastIndexOf("\n", range.startOffset - 1) + 1;
            const linePrefix = text.slice(lineStart, range.startOffset);
            if (linePrefix.startsWith("  ") || linePrefix.startsWith("\t")) {
              const removeCount = linePrefix.startsWith("\t") ? 1 : 2;
              node.textContent = text.slice(0, lineStart) + text.slice(lineStart + removeCount);
              range.setStart(node, Math.max(lineStart, range.startOffset - removeCount));
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
              handleInput();
            }
          }
        } else {
          const indent = document.createTextNode("  ");
          range.deleteContents();
          range.insertNode(indent);
          range.setStartAfter(indent);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          handleInput();
        }
        return;
      }

      if (e.key === "Enter" && !e.shiftKey) {
        const node = range.startContainer;
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent) return;
        
        const text = node.textContent;
        const lineStart = text.lastIndexOf("\n", range.startOffset - 1) + 1;
        const currentLine = text.slice(lineStart, range.startOffset);
        
        const unorderedListMatch = currentLine.match(/^(\s*)([-*])\s/);
        const orderedListMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
        
        if (!unorderedListMatch && !orderedListMatch) return;
        
        const lineContent = currentLine.replace(/^\s*[-*]\s|^\s*\d+\.\s/, "").trim();
        
        if (!lineContent) {
          e.preventDefault();
          node.textContent = text.slice(0, lineStart) + "\n" + text.slice(range.startOffset);
          range.setStart(node, lineStart + 1);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          handleInput();
          return;
        }
        
        e.preventDefault();
        let nextListPrefix = "";
        if (unorderedListMatch) {
          nextListPrefix = `${unorderedListMatch[1]}${unorderedListMatch[2]} `;
        } else if (orderedListMatch) {
          nextListPrefix = `${orderedListMatch[1]}${parseInt(orderedListMatch[2]) + 1}. `;
        }
        
        node.textContent = text.slice(0, range.startOffset) + "\n" + nextListPrefix + text.slice(range.startOffset);
        range.setStart(node, range.startOffset + 1 + nextListPrefix.length);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        handleInput();
      }
    },
    [handleInput]
  );

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
        "[&_.inline-code]:px-1.5 [&_.inline-code]:py-0.5 [&_.inline-code]:bg-white/[0.08] [&_.inline-code]:rounded [&_.inline-code]:text-[14px] [&_.inline-code]:text-violet-300 [&_.inline-code]:font-mono",
        "[&_code]:px-1.5 [&_code]:py-0.5 [&_code]:bg-white/[0.08] [&_code]:rounded [&_code]:text-[14px] [&_code]:text-violet-300 [&_code]:font-mono",
        "[&_.code-block]:block [&_.code-block]:p-4 [&_.code-block]:my-3 [&_.code-block]:bg-black/40 [&_.code-block]:rounded-lg [&_.code-block]:border [&_.code-block]:border-white/[0.08] [&_.code-block]:overflow-x-auto [&_.code-block]:whitespace-pre",
        "[&_.markdown-h1]:text-3xl [&_.markdown-h1]:font-bold [&_.markdown-h1]:mt-6 [&_.markdown-h1]:mb-4 [&_.markdown-h1]:text-white",
        "[&_.markdown-h2]:text-2xl [&_.markdown-h2]:font-bold [&_.markdown-h2]:mt-5 [&_.markdown-h2]:mb-3 [&_.markdown-h2]:text-white",
        "[&_.markdown-h3]:text-xl [&_.markdown-h3]:font-semibold [&_.markdown-h3]:mt-4 [&_.markdown-h3]:mb-2 [&_.markdown-h3]:text-white/95",
        "[&_.markdown-h4]:text-lg [&_.markdown-h4]:font-semibold [&_.markdown-h4]:mt-3 [&_.markdown-h4]:mb-2 [&_.markdown-h4]:text-white/90",
        "[&_.markdown-h5]:text-base [&_.markdown-h5]:font-medium [&_.markdown-h5]:mt-2 [&_.markdown-h5]:mb-1 [&_.markdown-h5]:text-white/85",
        "[&_.markdown-h6]:text-sm [&_.markdown-h6]:font-medium [&_.markdown-h6]:mt-2 [&_.markdown-h6]:mb-1 [&_.markdown-h6]:text-white/80",
        "[&_.markdown-list]:my-2 [&_.markdown-list]:pl-6",
        "[&_.markdown-list_li]:my-1",
        "[&_ul.markdown-list]:list-disc",
        "[&_ol.markdown-list]:list-decimal",
        "[&_.markdown-blockquote]:pl-4 [&_.markdown-blockquote]:border-l-2 [&_.markdown-blockquote]:border-white/20 [&_.markdown-blockquote]:text-white/60 [&_.markdown-blockquote]:italic [&_.markdown-blockquote]:my-3",
        "[&_.markdown-hr]:border-0 [&_.markdown-hr]:h-px [&_.markdown-hr]:bg-white/10 [&_.markdown-hr]:my-6",
        className
      )}
      style={{ wordBreak: "break-word" }}
      data-placeholder={placeholder}
      onInput={handleInput}
      onPaste={handlePaste}
      onMouseUp={handleSelection}
      onKeyUp={handleSelection}
      onKeyDown={handleKeyDown}
    />
  );
}

export default RichEditor;
