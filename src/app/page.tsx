"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Pin, Check, Sparkles, X, ChevronRight, ChevronDown,
  MoreHorizontal, Trash2, Archive, Search,
  Hash, Zap, Film, Heart, Gamepad2, Calendar,
  ArrowLeft, Loader2, Command, Settings, User, Key, ExternalLink, FileText,
  GripVertical, CornerDownRight, Image, Link2, Upload, Globe,
  Save, Clock, ArchiveRestore
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useItems, useUpdateItem, useCreateItem, useArchiveItem, useUnarchiveItem, usePinItem, useDeleteItem } from "@/hooks/use-items";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Item, Bucket, Subtask, ApiKey } from "@/types";
import { LogOut, Copy, Eye, EyeOff, Palette, Bell, Shield } from "lucide-react";

// Save status type
type SaveStatus = "idle" | "saving" | "saved";

// ============================================
// Atlassian Document Format (ADF) Types
// Confluence互換のドキュメント構造
// ============================================

// Mark types (インライン装飾)
interface ADFMarkStrong { type: "strong"; }
interface ADFMarkEm { type: "em"; }
interface ADFMarkCode { type: "code"; }
interface ADFMarkStrike { type: "strike"; }
interface ADFMarkUnderline { type: "underline"; }
interface ADFMarkLink {
  type: "link";
  attrs: { href: string; title?: string; };
}
interface ADFMarkTextColor {
  type: "textColor";
  attrs: { color: string; };
}

type ADFMark = ADFMarkStrong | ADFMarkEm | ADFMarkCode | ADFMarkStrike |
               ADFMarkUnderline | ADFMarkLink | ADFMarkTextColor;

// Inline nodes
interface ADFTextNode {
  type: "text";
  text: string;
  marks?: ADFMark[];
}

interface ADFHardBreak {
  type: "hardBreak";
}

interface ADFMention {
  type: "mention";
  attrs: { id: string; text: string; };
}

interface ADFEmoji {
  type: "emoji";
  attrs: { shortName: string; text?: string; };
}

interface ADFInlineCard {
  type: "inlineCard";
  attrs: { url: string; };
}

type ADFInlineNode = ADFTextNode | ADFHardBreak | ADFMention | ADFEmoji | ADFInlineCard;

// Block nodes
interface ADFParagraph {
  type: "paragraph";
  content?: ADFInlineNode[];
}

interface ADFHeading {
  type: "heading";
  attrs: { level: 1 | 2 | 3 | 4 | 5 | 6; };
  content?: ADFInlineNode[];
}

interface ADFCodeBlock {
  type: "codeBlock";
  attrs?: { language?: string; };
  content?: ADFTextNode[];
}

interface ADFBlockquote {
  type: "blockquote";
  content: ADFBlockNode[];
}

interface ADFBulletList {
  type: "bulletList";
  content: ADFListItem[];
}

interface ADFOrderedList {
  type: "orderedList";
  attrs?: { order?: number; };
  content: ADFListItem[];
}

interface ADFListItem {
  type: "listItem";
  content: ADFBlockNode[];
}

interface ADFTaskList {
  type: "taskList";
  attrs: { localId: string; };
  content: ADFTaskItem[];
}

interface ADFTaskItem {
  type: "taskItem";
  attrs: { localId: string; state: "TODO" | "DONE"; };
  content?: ADFInlineNode[];
}

interface ADFRule {
  type: "rule"; // 水平線
}

interface ADFPanel {
  type: "panel";
  attrs: { panelType: "info" | "note" | "warning" | "error" | "success"; };
  content: ADFBlockNode[];
}

interface ADFExpand {
  type: "expand";
  attrs?: { title?: string; };
  content: ADFBlockNode[];
}

// Media nodes
interface ADFMedia {
  type: "media";
  attrs: {
    id: string;
    type: "file" | "link" | "external";
    collection?: string;
    url?: string;
    width?: number;
    height?: number;
    alt?: string;
  };
}

interface ADFMediaSingle {
  type: "mediaSingle";
  attrs?: { layout?: "center" | "wide" | "full-width" | "wrap-left" | "wrap-right"; };
  content: [ADFMedia];
}

interface ADFMediaGroup {
  type: "mediaGroup";
  content: ADFMedia[];
}

// Table nodes
interface ADFTable {
  type: "table";
  attrs?: { isNumberColumnEnabled?: boolean; layout?: "default" | "wide" | "full-width"; };
  content: ADFTableRow[];
}

interface ADFTableRow {
  type: "tableRow";
  content: (ADFTableHeader | ADFTableCell)[];
}

interface ADFTableHeader {
  type: "tableHeader";
  attrs?: { colspan?: number; rowspan?: number; colwidth?: number[]; background?: string; };
  content: ADFBlockNode[];
}

interface ADFTableCell {
  type: "tableCell";
  attrs?: { colspan?: number; rowspan?: number; colwidth?: number[]; background?: string; };
  content: ADFBlockNode[];
}

// Note link (カスタム拡張 - Confluence互換ではないがアプリ用)
interface ADFNoteLink {
  type: "noteLink";
  attrs: { noteId: string; noteTitle: string; };
}

type ADFBlockNode = ADFParagraph | ADFHeading | ADFCodeBlock | ADFBlockquote |
                    ADFBulletList | ADFOrderedList | ADFTaskList | ADFRule |
                    ADFPanel | ADFExpand | ADFMediaSingle | ADFMediaGroup | ADFTable;

// Document root
interface ADFDocument {
  version: 1;
  type: "doc";
  content: ADFBlockNode[];
}

// ============================================
// ADF Helper Functions
// ============================================

// テキストノード作成
function adfText(text: string, marks?: ADFMark[]): ADFTextNode {
  return marks ? { type: "text", text, marks } : { type: "text", text };
}

// パラグラフ作成
function adfParagraph(content: ADFInlineNode[]): ADFParagraph {
  return { type: "paragraph", content };
}

// 見出し作成
function adfHeading(level: 1 | 2 | 3 | 4 | 5 | 6, content: ADFInlineNode[]): ADFHeading {
  return { type: "heading", attrs: { level }, content };
}

// コードブロック作成
function adfCodeBlock(code: string, language?: string): ADFCodeBlock {
  return {
    type: "codeBlock",
    attrs: language ? { language } : undefined,
    content: [{ type: "text", text: code }]
  };
}

// リストアイテム作成
function adfListItem(content: ADFBlockNode[]): ADFListItem {
  return { type: "listItem", content };
}

// タスクアイテム作成
function adfTaskItem(text: string, done: boolean): ADFTaskItem {
  return {
    type: "taskItem",
    attrs: { localId: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`, state: done ? "DONE" : "TODO" },
    content: [adfText(text)]
  };
}

// メディア作成
function adfMedia(url: string, alt?: string): ADFMediaSingle {
  return {
    type: "mediaSingle",
    attrs: { layout: "center" },
    content: [{
      type: "media",
      attrs: {
        id: `media-${Date.now()}`,
        type: "external",
        url,
        alt
      }
    }]
  };
}

// 空のドキュメント
function createEmptyADFDocument(): ADFDocument {
  return {
    version: 1,
    type: "doc",
    content: [{ type: "paragraph", content: [] }]
  };
}

// ============================================
// ADF → プレーンテキスト変換
// ============================================

function adfInlineToPlainText(nodes: ADFInlineNode[] | undefined): string {
  if (!nodes) return "";
  return nodes.map(node => {
    switch (node.type) {
      case "text":
        // マークを考慮してMarkdown形式で出力
        let text = node.text;
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === "strong") text = `**${text}**`;
            if (mark.type === "em") text = `_${text}_`;
            if (mark.type === "code") text = `\`${text}\``;
            if (mark.type === "link") {
              // note:// リンクは [[ノート名]] 形式に
              if (mark.attrs.href.startsWith("note://")) {
                text = `[[${mark.attrs.href.replace("note://", "")}]]`;
              } else {
                // 外部リンクはMarkdown形式 [text](url)
                text = `[${text}](${mark.attrs.href})`;
              }
            }
          }
        }
        return text;
      case "hardBreak":
        return "\n";
      case "mention":
        return `@${node.attrs.text}`;
      case "emoji":
        return node.attrs.text || `:${node.attrs.shortName}:`;
      case "inlineCard":
        return node.attrs.url;
      default:
        return "";
    }
  }).join("");
}

function adfBlockToPlainText(node: ADFBlockNode): string {
  switch (node.type) {
    case "paragraph":
      return adfInlineToPlainText(node.content);
    case "heading": {
      const prefix = "#".repeat(node.attrs.level);
      return `${prefix} ${adfInlineToPlainText(node.content)}`;
    }
    case "codeBlock": {
      const lang = node.attrs?.language || "";
      const code = node.content?.map(t => t.text).join("") || "";
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }
    case "blockquote":
      return node.content.map(b => `> ${adfBlockToPlainText(b)}`).join("\n");
    case "bulletList":
      return node.content.map(item => {
        const itemContent = item.content.map(adfBlockToPlainText).join("\n");
        return `• ${itemContent}`;
      }).join("\n");
    case "orderedList":
      return node.content.map((item, i) => {
        const itemContent = item.content.map(adfBlockToPlainText).join("\n");
        return `${(node.attrs?.order || 1) + i}. ${itemContent}`;
      }).join("\n");
    case "taskList":
      return node.content.map(task => {
        const checkbox = task.attrs.state === "DONE" ? "[x]" : "[ ]";
        return `${checkbox} ${adfInlineToPlainText(task.content)}`;
      }).join("\n");
    case "rule":
      return "---";
    case "panel":
      return `[${node.attrs.panelType.toUpperCase()}]\n${node.content.map(adfBlockToPlainText).join("\n")}`;
    case "expand":
      return `> ${node.attrs?.title || "詳細"}\n${node.content.map(adfBlockToPlainText).join("\n")}`;
    case "mediaSingle": {
      const media = node.content[0];
      const alt = media.attrs.alt || "画像";
      const url = media.attrs.url || "";
      return `![${alt}](${url})`;
    }
    case "mediaGroup":
      return node.content.map(m => {
        const alt = m.attrs.alt || "画像";
        const url = m.attrs.url || "";
        return `![${alt}](${url})`;
      }).join("\n");
    case "table":
      return node.content.map(row =>
        row.content.map(cell =>
          cell.content.map(adfBlockToPlainText).join(" ")
        ).join(" | ")
      ).join("\n");
    default:
      return "";
  }
}

function adfToPlainText(doc: ADFDocument): string {
  return doc.content.map(adfBlockToPlainText).join("\n\n");
}

// プレーンテキスト → ADF変換（簡易版）
function plainTextToADF(text: string): ADFDocument {
  const lines = text.split("\n");
  const content: ADFBlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 空行はスキップ
    if (line.trim() === "") {
      i++;
      continue;
    }

    // コードブロック ```
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      content.push(adfCodeBlock(codeLines.join("\n"), lang || undefined));
      i++;
      continue;
    }

    // 見出し # or ##
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1].length) as 1 | 2 | 3 | 4 | 5 | 6;
      content.push(adfHeading(level, parseInlineContent(headingMatch[2])));
      i++;
      continue;
    }

    // タスクリスト [ ] or [x]
    if (line.match(/^\[[ x]\]/)) {
      const taskItems: ADFTaskItem[] = [];
      while (i < lines.length && lines[i].match(/^\[[ x]\]/)) {
        const taskMatch = lines[i].match(/^\[([ x])\]\s*(.*)$/);
        if (taskMatch) {
          taskItems.push({
            type: "taskItem",
            attrs: {
              localId: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              state: taskMatch[1] === "x" ? "DONE" : "TODO"
            },
            content: parseInlineContent(taskMatch[2])
          });
        }
        i++;
      }
      content.push({
        type: "taskList",
        attrs: { localId: `tasklist-${Date.now()}` },
        content: taskItems
      });
      continue;
    }

    // 箇条書き • or -
    if (line.match(/^[•\-]\s/)) {
      const listItems: ADFListItem[] = [];
      while (i < lines.length && lines[i].match(/^[•\-]\s/)) {
        const itemText = lines[i].replace(/^[•\-]\s/, "");
        listItems.push({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInlineContent(itemText) }]
        });
        i++;
      }
      content.push({ type: "bulletList", content: listItems });
      continue;
    }

    // Markdown画像記法 ![alt](url)
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      content.push({
        type: "mediaSingle",
        attrs: { layout: "center" },
        content: [{
          type: "media",
          attrs: {
            id: `media-${Date.now()}`,
            type: "external",
            url: imageMatch[2].trim(),
            alt: imageMatch[1].trim() || "画像"
          }
        }]
      });
      i++;
      continue;
    }

    // パネル [INFO], [WARNING], etc.
    const panelMatch = line.match(/^\[(INFO|NOTE|WARNING|ERROR|SUCCESS)\]$/i);
    if (panelMatch) {
      const panelType = panelMatch[1].toLowerCase() as "info" | "note" | "warning" | "error" | "success";
      const panelContent: ADFBlockNode[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "" && !lines[i].match(/^\[/)) {
        panelContent.push({ type: "paragraph", content: parseInlineContent(lines[i]) });
        i++;
      }
      content.push({ type: "panel", attrs: { panelType }, content: panelContent });
      continue;
    }

    // 通常のパラグラフ
    content.push({ type: "paragraph", content: parseInlineContent(line) });
    i++;
  }

  return { version: 1, type: "doc", content };
}

// インラインコンテンツをパース
function parseInlineContent(text: string): ADFInlineNode[] {
  const nodes: ADFInlineNode[] = [];
  // Markdown記法: **bold**, _italic_, `code`, [[note]], [text](url), https://...
  const regex = /(\*\*([^*]+)\*\*|_([^_]+)_|`([^`]+)`|\[\[([^\]]+)\]\]|(?<!!)\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s\)]+))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // マッチ前のテキスト
    if (match.index > lastIndex) {
      nodes.push(adfText(text.slice(lastIndex, match.index)));
    }

    if (match[2]) {
      // **bold**
      nodes.push(adfText(match[2], [{ type: "strong" }]));
    } else if (match[3]) {
      // _italic_
      nodes.push(adfText(match[3], [{ type: "em" }]));
    } else if (match[4]) {
      // `code`
      nodes.push(adfText(match[4], [{ type: "code" }]));
    } else if (match[5]) {
      // [[note link]]
      nodes.push(adfText(match[5], [{ type: "link", attrs: { href: `note://${match[5]}` } }]));
    } else if (match[6] && match[7]) {
      // [text](url) - Markdown link
      nodes.push(adfText(match[6], [{ type: "link", attrs: { href: match[7] } }]));
    } else if (match[8]) {
      // URL (plain)
      nodes.push(adfText(match[8], [{ type: "link", attrs: { href: match[8] } }]));
    }

    lastIndex = match.index + match[0].length;
  }

  // 残りのテキスト
  if (lastIndex < text.length) {
    nodes.push(adfText(text.slice(lastIndex)));
  }

  return nodes.length > 0 ? nodes : [adfText(text)];
}

// ============================================
// ADFRenderer コンポーネント
// ============================================

interface ADFRendererProps {
  document: ADFDocument;
  onNoteLinkClick?: (noteTitle: string) => void;
  onImageClick?: (url: string) => void;
  className?: string;
}

function ADFInlineRenderer({
  nodes,
  onNoteLinkClick
}: {
  nodes?: ADFInlineNode[];
  onNoteLinkClick?: (noteTitle: string) => void;
}) {
  if (!nodes) return null;

  return (
    <>
      {nodes.map((node, i) => {
        switch (node.type) {
          case "text": {
            let element: React.ReactNode = node.text;

            if (node.marks) {
              for (const mark of node.marks) {
                switch (mark.type) {
                  case "strong":
                    element = <strong key={`strong-${i}`} className="font-bold text-white/80">{element}</strong>;
                    break;
                  case "em":
                    element = <em key={`em-${i}`} className="italic">{element}</em>;
                    break;
                  case "code":
                    element = <code key={`code-${i}`} className="px-1.5 py-0.5 bg-white/[0.08] rounded text-[14px] text-violet-300 font-mono">{element}</code>;
                    break;
                  case "strike":
                    element = <s key={`strike-${i}`} className="line-through text-white/40">{element}</s>;
                    break;
                  case "underline":
                    element = <u key={`underline-${i}`}>{element}</u>;
                    break;
                  case "link": {
                    const href = mark.attrs.href;
                    if (href.startsWith("note://")) {
                      const noteTitle = href.replace("note://", "");
                      element = (
                        <span
                          key={`notelink-${i}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onNoteLinkClick?.(noteTitle);
                          }}
                          className="px-1.5 py-0.5 rounded cursor-pointer transition-colors text-violet-400 bg-violet-500/10 hover:bg-violet-500/20"
                        >
                          {element}
                        </span>
                      );
                    } else {
                      element = (
                        <a
                          key={`link-${i}`}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline break-all"
                          onClick={e => e.stopPropagation()}
                        >
                          {element}
                        </a>
                      );
                    }
                    break;
                  }
                  case "textColor":
                    element = <span key={`color-${i}`} style={{ color: mark.attrs.color }}>{element}</span>;
                    break;
                }
              }
            }
            return <span key={i}>{element}</span>;
          }
          case "hardBreak":
            return <br key={i} />;
          case "mention":
            return (
              <span key={i} className="px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                @{node.attrs.text}
              </span>
            );
          case "emoji":
            return <span key={i}>{node.attrs.text || `:${node.attrs.shortName}:`}</span>;
          case "inlineCard":
            return (
              <a
                key={i}
                href={node.attrs.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                {node.attrs.url}
              </a>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

function ADFBlockRenderer({
  node,
  onNoteLinkClick,
  onImageClick
}: {
  node: ADFBlockNode;
  onNoteLinkClick?: (noteTitle: string) => void;
  onImageClick?: (url: string) => void;
}) {
  switch (node.type) {
    case "paragraph":
      return (
        <p className="text-[16px] text-white/55 leading-[1.9]">
          <ADFInlineRenderer nodes={node.content} onNoteLinkClick={onNoteLinkClick} />
        </p>
      );

    case "heading": {
      const level = node.attrs.level;
      const sizeClasses: Record<number, string> = {
        1: "text-[24px] font-bold text-white/90",
        2: "text-[20px] font-bold text-white/85",
        3: "text-[18px] font-semibold text-white/80",
        4: "text-[16px] font-semibold text-white/75",
        5: "text-[15px] font-medium text-white/70",
        6: "text-[14px] font-medium text-white/65",
      };
      const className = sizeClasses[level] || sizeClasses[3];
      const content = <ADFInlineRenderer nodes={node.content} onNoteLinkClick={onNoteLinkClick} />;
      switch (level) {
        case 1: return <h1 className={className}>{content}</h1>;
        case 2: return <h2 className={className}>{content}</h2>;
        case 3: return <h3 className={className}>{content}</h3>;
        case 4: return <h4 className={className}>{content}</h4>;
        case 5: return <h5 className={className}>{content}</h5>;
        case 6: return <h6 className={className}>{content}</h6>;
        default: return <h3 className={className}>{content}</h3>;
      }
    }

    case "codeBlock":
      return (
        <pre className="p-4 bg-white/[0.04] rounded-lg border border-white/[0.06] overflow-x-auto">
          <code className="text-[14px] text-violet-300 font-mono leading-relaxed">
            {node.content?.map(t => t.text).join("") || ""}
          </code>
        </pre>
      );

    case "blockquote":
      return (
        <blockquote className="pl-4 border-l-2 border-white/20 text-white/50 italic">
          {node.content.map((block, i) => (
            <ADFBlockRenderer key={i} node={block} onNoteLinkClick={onNoteLinkClick} onImageClick={onImageClick} />
          ))}
        </blockquote>
      );

    case "bulletList":
      return (
        <ul className="space-y-1">
          {node.content.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-white/30 mt-0.5">•</span>
              <div className="flex-1">
                {item.content.map((block, j) => (
                  <ADFBlockRenderer key={j} node={block} onNoteLinkClick={onNoteLinkClick} onImageClick={onImageClick} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      );

    case "orderedList":
      return (
        <ol className="space-y-1">
          {node.content.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-white/30 font-mono text-[14px] mt-0.5">{(node.attrs?.order || 1) + i}.</span>
              <div className="flex-1">
                {item.content.map((block, j) => (
                  <ADFBlockRenderer key={j} node={block} onNoteLinkClick={onNoteLinkClick} onImageClick={onImageClick} />
                ))}
              </div>
            </li>
          ))}
        </ol>
      );

    case "taskList":
      return (
        <div className="space-y-2">
          {node.content.map((task, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className={cn(
                  "mt-1 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center",
                  task.attrs.state === "DONE"
                    ? "bg-emerald-500/20 border-emerald-500/40"
                    : "border-white/20"
                )}
              >
                {task.attrs.state === "DONE" && (
                  <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />
                )}
              </div>
              <span className={cn(
                "text-[16px] leading-[1.9]",
                task.attrs.state === "DONE" ? "text-white/30 line-through" : "text-white/55"
              )}>
                <ADFInlineRenderer nodes={task.content} onNoteLinkClick={onNoteLinkClick} />
              </span>
            </div>
          ))}
        </div>
      );

    case "rule":
      return <hr className="border-white/10 my-4" />;

    case "panel": {
      const panelStyles: Record<string, { bg: string; border: string; icon: string }> = {
        info: { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-400" },
        note: { bg: "bg-gray-500/10", border: "border-gray-500/20", icon: "text-gray-400" },
        warning: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-400" },
        error: { bg: "bg-red-500/10", border: "border-red-500/20", icon: "text-red-400" },
        success: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-400" },
      };
      const style = panelStyles[node.attrs.panelType] || panelStyles.info;
      return (
        <div className={`p-4 rounded-lg border ${style.bg} ${style.border}`}>
          {node.content.map((block, i) => (
            <ADFBlockRenderer key={i} node={block} onNoteLinkClick={onNoteLinkClick} onImageClick={onImageClick} />
          ))}
        </div>
      );
    }

    case "expand":
      return (
        <details className="group">
          <summary className="cursor-pointer text-white/60 hover:text-white/80 transition-colors">
            {node.attrs?.title || "詳細"}
          </summary>
          <div className="pl-4 mt-2">
            {node.content.map((block, i) => (
              <ADFBlockRenderer key={i} node={block} onNoteLinkClick={onNoteLinkClick} onImageClick={onImageClick} />
            ))}
          </div>
        </details>
      );

    case "mediaSingle": {
      const media = node.content[0];
      if (!media.attrs.url) {
        return (
          <div className="text-white/20 text-[14px] italic py-2">
            [画像: {media.attrs.alt || "画像"}]
          </div>
        );
      }
      return (
        <div className="group relative my-4">
          <div
            className="relative rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06] cursor-pointer"
            onClick={() => onImageClick?.(media.attrs.url!)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media.attrs.url}
              alt={media.attrs.alt || ""}
              className="w-full max-h-[400px] object-cover"
            />
          </div>
          {media.attrs.alt && (
            <p className="text-[11px] text-white/30 mt-2 text-center">{media.attrs.alt}</p>
          )}
        </div>
      );
    }

    case "mediaGroup":
      return (
        <div className="grid grid-cols-2 gap-2 my-4">
          {node.content.map((media, i) => (
            <div
              key={i}
              className="rounded-lg overflow-hidden bg-white/[0.02] border border-white/[0.06] cursor-pointer"
              onClick={() => media.attrs.url && onImageClick?.(media.attrs.url)}
            >
              {media.attrs.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={media.attrs.url}
                  alt={media.attrs.alt || ""}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 flex items-center justify-center text-white/20 text-[12px]">
                  [画像: {media.attrs.alt || "画像"}]
                </div>
              )}
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse">
            <tbody>
              {node.content.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.content.map((cell, cellIdx) => {
                    const CellTag = cell.type === "tableHeader" ? "th" : "td";
                    return (
                      <CellTag
                        key={cellIdx}
                        className={cn(
                          "border border-white/10 px-3 py-2 text-left",
                          cell.type === "tableHeader" && "bg-white/[0.04] font-medium"
                        )}
                        colSpan={cell.attrs?.colspan}
                        rowSpan={cell.attrs?.rowspan}
                        style={cell.attrs?.background ? { backgroundColor: cell.attrs.background } : undefined}
                      >
                        {cell.content.map((block, blockIdx) => (
                          <ADFBlockRenderer key={blockIdx} node={block} onNoteLinkClick={onNoteLinkClick} onImageClick={onImageClick} />
                        ))}
                      </CellTag>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
}

function ADFRenderer({ document, onNoteLinkClick, onImageClick, className }: ADFRendererProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {document.content.map((node, i) => (
        <ADFBlockRenderer
          key={i}
          node={node}
          onNoteLinkClick={onNoteLinkClick}
          onImageClick={onImageClick}
        />
      ))}
    </div>
  );
}

// ============================================
// Legacy types (後方互換用、将来削除)
// ============================================
interface EmbeddedMedia {
  id: string;
  type: "image" | "link";
  url: string;
  title?: string;
  description?: string;
  position: number;
}

// Mock data - ADF形式のコンテンツ
const mockNotes: {
  id: string;
  title: string;
  adfContent: ADFDocument;
  bucket: string | null;
  pinned: boolean;
  color: string;
  updatedAt: string;
  tags: string[];
  archived: boolean;
}[] = [
  {
    id: "1",
    title: "ミーティングメモ",
    adfContent: {
      version: 1,
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Aさんとの話" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "予算は" },
            { type: "text", text: "100万円", marks: [{ type: "strong" }] },
            { type: "text", text: "で進める" }
          ]
        },
        {
          type: "mediaSingle",
          attrs: { layout: "center" },
          content: [{
            type: "media",
            attrs: { id: "m1", type: "external", url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800", alt: "ミーティング風景" }
          }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "来週までに資料作成が必要" }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "次回ミーティングは金曜日14時" }]
        },
        {
          type: "panel",
          attrs: { panelType: "info" },
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "予算資料: " },
                { type: "text", text: "Google Slides", marks: [{ type: "link", attrs: { href: "https://docs.google.com/presentation/d/example" } }] }
              ]
            }
          ]
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "関連: " },
            { type: "text", text: "Agent開発メモ", marks: [{ type: "link", attrs: { href: "note://Agent開発メモ" } }] }
          ]
        }
      ]
    },
    bucket: "management",
    pinned: true,
    color: "amber",
    updatedAt: "3時間前",
    tags: ["meeting", "budget"],
    archived: false,
  },
  {
    id: "2",
    title: "動画ネタ帳",
    adfContent: {
      version: 1,
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "実写かめはめ波 - VFX練習に最適" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "猫ミーム再現 - バズりそう" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "AI音声で漫才 - 技術デモとして" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "逆再生チャレンジ" }] }] }
          ]
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "参考: " },
            { type: "text", text: "YouTube動画", marks: [{ type: "link", attrs: { href: "https://www.youtube.com/watch?v=example" } }] }
          ]
        }
      ]
    },
    bucket: "video",
    pinned: true,
    color: "blue",
    updatedAt: "昨日",
    tags: ["idea", "youtube"],
    archived: false,
  },
  {
    id: "3",
    title: "Agent開発メモ",
    adfContent: {
      version: 1,
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Claude Code の新機能まとめ" }] },
        {
          type: "mediaSingle",
          attrs: { layout: "center" },
          content: [{
            type: "media",
            attrs: { id: "m4", type: "external", url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800", alt: "アーキテクチャ図" }
          }]
        },
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "MCP Server対応" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "カスタムツール追加" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "メモリ機能の改善" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "マルチエージェント構成" }] }] }
          ]
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "公式: " },
            { type: "text", text: "Anthropic Docs", marks: [{ type: "link", attrs: { href: "https://docs.anthropic.com" } }] }
          ]
        },
        {
          type: "codeBlock",
          attrs: { language: "typescript" },
          content: [{ type: "text", text: "const client = new Anthropic();\nawait client.messages.create({...});" }]
        }
      ]
    },
    bucket: "agent",
    pinned: false,
    color: "violet",
    updatedAt: "2日前",
    tags: ["tech", "ai"],
    archived: false,
  },
  {
    id: "4",
    title: "RFM分析タスク",
    adfContent: {
      version: 1,
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "顧客セグメント分析" }] },
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Recency", marks: [{ type: "strong" }] }, { type: "text", text: ": 最終購入日" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Frequency", marks: [{ type: "strong" }] }, { type: "text", text: ": 購入頻度" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Monetary", marks: [{ type: "strong" }] }, { type: "text", text: ": 購入金額" }] }] }
          ]
        },
        {
          type: "panel",
          attrs: { panelType: "warning" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "次回レポート提出: 来週月曜" }] }]
        }
      ]
    },
    bucket: "rfm",
    pinned: false,
    color: "emerald",
    updatedAt: "2日前",
    tags: ["analytics", "customer"],
    archived: false,
  },
  {
    id: "5",
    title: "買い物リスト",
    adfContent: {
      version: 1,
      type: "doc",
      content: [
        {
          type: "taskList",
          attrs: { localId: "tasklist-1" },
          content: [
            { type: "taskItem", attrs: { localId: "t1", state: "TODO" }, content: [{ type: "text", text: "牛乳" }] },
            { type: "taskItem", attrs: { localId: "t2", state: "TODO" }, content: [{ type: "text", text: "卵" }] },
            { type: "taskItem", attrs: { localId: "t3", state: "DONE" }, content: [{ type: "text", text: "パン" }] },
            { type: "taskItem", attrs: { localId: "t4", state: "TODO" }, content: [{ type: "text", text: "野菜（キャベツ、にんじん）" }] },
            { type: "taskItem", attrs: { localId: "t5", state: "TODO" }, content: [{ type: "text", text: "お米 5kg" }] }
          ]
        }
      ]
    },
    bucket: "life",
    pinned: false,
    color: "rose",
    updatedAt: "3日前",
    tags: ["shopping"],
    archived: false,
  },
  {
    id: "6",
    title: "ボドゲアイデア",
    adfContent: {
      version: 1,
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "協力型推理ゲーム" }] },
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "プレイヤー同士の情報共有が鍵" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "リアルタイム要素を入れる" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "アプリ連携で音響演出" }] }] }
          ]
        }
      ]
    },
    bucket: "boardgame",
    pinned: false,
    color: "cyan",
    updatedAt: "1週間前",
    tags: ["game", "idea"],
    archived: false,
  },
  {
    id: "7",
    title: "古いプロジェクト",
    adfContent: {
      version: 1,
      type: "doc",
      content: [
        {
          type: "panel",
          attrs: { panelType: "note" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "終了したプロジェクトのメモ。アーカイブ済み。" }] }]
        }
      ]
    },
    bucket: "management",
    pinned: false,
    color: "amber",
    updatedAt: "1ヶ月前",
    tags: ["old"],
    archived: true,
  },
];

// 階層構造を持つタスク (parent_id + depth でOutliner風に)
const mockTasks = [
  { id: "t1", title: "資料を作成する", noteId: "1", dueDate: "金曜", completed: false, memo: "パワポで10枚程度、グラフ必須", parentId: null, depth: 0 },
  { id: "t1-1", title: "データを集める", noteId: "1", dueDate: "水曜", completed: false, memo: "", parentId: "t1", depth: 1 },
  { id: "t1-2", title: "グラフを作成", noteId: "1", dueDate: "木曜", completed: false, memo: "棒グラフと円グラフ", parentId: "t1", depth: 1 },
  { id: "t1-2-1", title: "売上データ", noteId: "1", dueDate: null, completed: true, memo: "", parentId: "t1-2", depth: 2 },
  { id: "t1-2-2", title: "顧客データ", noteId: "1", dueDate: null, completed: false, memo: "", parentId: "t1-2", depth: 2 },
  { id: "t2", title: "Aさんに連絡", noteId: "1", dueDate: "今日", completed: false, memo: "予算の件で確認が必要", parentId: null, depth: 0 },
  { id: "t3", title: "RFMレポート提出", noteId: "4", dueDate: "月曜", completed: false, memo: "", parentId: null, depth: 0 },
  { id: "t3-1", title: "セグメント分析", noteId: "4", dueDate: null, completed: true, memo: "", parentId: "t3", depth: 1 },
  { id: "t3-2", title: "レポート作成", noteId: "4", dueDate: null, completed: false, memo: "", parentId: "t3", depth: 1 },
  { id: "t4", title: "牛乳を買う", noteId: "5", dueDate: null, completed: false, memo: "低脂肪じゃないやつ", parentId: null, depth: 0 },
  { id: "t5", title: "撮影テスト", noteId: "2", dueDate: null, completed: true, memo: "照明チェック完了", parentId: null, depth: 0 },
];

const colorConfig: Record<string, { dot: string; glow: string; bg: string; border: string; text: string; cardBg: string; hoverBorder: string }> = {
  amber: { dot: "bg-amber-400", glow: "shadow-amber-400/50", bg: "bg-amber-500/10", border: "border-amber-500/25", text: "text-amber-400", cardBg: "from-amber-500/[0.08] to-amber-500/[0.02]", hoverBorder: "hover:border-amber-400/40" },
  blue: { dot: "bg-blue-400", glow: "shadow-blue-400/50", bg: "bg-blue-500/10", border: "border-blue-500/25", text: "text-blue-400", cardBg: "from-blue-500/[0.08] to-blue-500/[0.02]", hoverBorder: "hover:border-blue-400/40" },
  emerald: { dot: "bg-emerald-400", glow: "shadow-emerald-400/50", bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400", cardBg: "from-emerald-500/[0.08] to-emerald-500/[0.02]", hoverBorder: "hover:border-emerald-400/40" },
  rose: { dot: "bg-rose-400", glow: "shadow-rose-400/50", bg: "bg-rose-500/10", border: "border-rose-500/25", text: "text-rose-400", cardBg: "from-rose-500/[0.08] to-rose-500/[0.02]", hoverBorder: "hover:border-rose-400/40" },
  violet: { dot: "bg-violet-400", glow: "shadow-violet-400/50", bg: "bg-violet-500/10", border: "border-violet-500/25", text: "text-violet-400", cardBg: "from-violet-500/[0.08] to-violet-500/[0.02]", hoverBorder: "hover:border-violet-400/40" },
  cyan: { dot: "bg-cyan-400", glow: "shadow-cyan-400/50", bg: "bg-cyan-500/10", border: "border-cyan-500/25", text: "text-cyan-400", cardBg: "from-cyan-500/[0.08] to-cyan-500/[0.02]", hoverBorder: "hover:border-cyan-400/40" },
};

const buckets = [
  { id: null, label: "All", icon: Hash, color: "text-white/50" },
  { id: "management", label: "Management", icon: Zap, color: "text-amber-400" },
  { id: "rfm", label: "RFM", icon: Hash, color: "text-emerald-400" },
  { id: "agent", label: "Agent", icon: Sparkles, color: "text-violet-400" },
  { id: "video", label: "Video", icon: Film, color: "text-blue-400" },
  { id: "life", label: "Life", icon: Heart, color: "text-rose-400" },
  { id: "boardgame", label: "Game", icon: Gamepad2, color: "text-cyan-400" },
];

type Note = typeof mockNotes[0];
type Task = typeof mockTasks[0];

// 階層タスクのヘルパー関数
function getChildTasks(tasks: Task[], parentId: string): Task[] {
  return tasks.filter(t => t.parentId === parentId);
}

function getTaskProgress(tasks: Task[], taskId: string): { completed: number; total: number } {
  const children = getChildTasks(tasks, taskId);
  if (children.length === 0) return { completed: 0, total: 0 };

  let completed = 0;
  let total = children.length;

  for (const child of children) {
    if (child.completed) completed++;
    const childProgress = getTaskProgress(tasks, child.id);
    total += childProgress.total;
    completed += childProgress.completed;
  }

  return { completed, total };
}

function getRootTasks(tasks: Task[], noteId?: string): Task[] {
  return tasks.filter(t =>
    t.parentId === null &&
    (noteId ? t.noteId === noteId : true)
  );
}

// 階層タスクアイテムコンポーネント
interface HierarchicalTaskItemProps {
  task: Task;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  collapsedTasks: Set<string>;
  toggleCollapse: (taskId: string) => void;
  handleToggleTask: (taskId: string) => void;
  setSelectedTask: (task: Task | null) => void;
  addSubtask: (parentId: string, noteId: string, parentDepth: number) => void;
  color: { bg: string; text: string; dot: string };
}

function HierarchicalTaskItem({
  task,
  tasks,
  setTasks,
  collapsedTasks,
  toggleCollapse,
  handleToggleTask,
  setSelectedTask,
  addSubtask,
  color,
}: HierarchicalTaskItemProps) {
  const children = getChildTasks(tasks, task.id);
  const hasChildren = children.length > 0;
  const isCollapsed = collapsedTasks.has(task.id);
  const progress = getTaskProgress(tasks, task.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleTitleBlur = () => {
    if (editTitle.trim() !== task.title) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, title: editTitle.trim() || task.title } : t));
    }
    setIsEditing(false);
  };

  return (
    <div>
      <div
        className={cn(
          "group rounded-xl transition-all",
          task.depth === 0 ? "p-3 bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08]" : "py-2 px-3 hover:bg-white/[0.02]"
        )}
        style={{ marginLeft: task.depth > 0 ? `${task.depth * 20}px` : 0 }}
      >
        <div className="flex items-start gap-2">
          {/* Collapse toggle or indent indicator */}
          <div className="w-5 flex-shrink-0 flex items-center justify-center mt-0.5">
            {hasChildren ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleCollapse(task.id); }}
                className="p-0.5 text-white/30 hover:text-white/60 hover:bg-white/[0.06] rounded transition-all"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            ) : task.depth > 0 ? (
              <CornerDownRight className="w-3 h-3 text-white/10" />
            ) : null}
          </div>

          {/* Checkbox */}
          <button
            onClick={() => handleToggleTask(task.id)}
            className={cn(
              "mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all",
              task.completed
                ? "bg-violet-500/20 border-violet-500/30"
                : "border-white/20 hover:border-violet-400 hover:bg-violet-500/10"
            )}
          >
            {task.completed && <Check className="w-3 h-3 text-violet-400" strokeWidth={3} />}
            {!task.completed && <Check className="w-3 h-3 text-violet-400 opacity-0 group-hover:opacity-30 transition-opacity" />}
          </button>

          {/* Task content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleBlur();
                    if (e.key === "Escape") { setEditTitle(task.title); setIsEditing(false); }
                  }}
                  autoFocus
                  className={cn(
                    "flex-1 bg-transparent outline-none border-b border-violet-500/50 text-white/90",
                    task.depth === 0 ? "text-[15px] font-medium" : "text-[14px]"
                  )}
                />
              ) : (
                <p
                  onDoubleClick={() => setIsEditing(true)}
                  className={cn(
                    "leading-snug cursor-text",
                    task.depth === 0 ? "text-[15px] font-medium" : "text-[14px]",
                    task.completed ? "text-white/30 line-through" : "text-white/80"
                  )}
                >
                  {task.title}
                </p>
              )}

              {/* Progress indicator for parent tasks */}
              {hasChildren && progress.total > 0 && (
                <span className="text-[10px] text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded">
                  {progress.completed}/{progress.total}
                </span>
              )}
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-2 mt-1">
              {task.dueDate && (
                <span className={cn(
                  "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded",
                  task.dueDate === "今日" ? "text-rose-400 bg-rose-500/10" : "text-white/30 bg-white/[0.04]"
                )}>
                  <Calendar className="w-2.5 h-2.5" />
                  {task.dueDate}
                </span>
              )}
              {task.memo && !hasChildren && (
                <span className="text-[10px] text-white/20 truncate max-w-[150px]">{task.memo}</span>
              )}
            </div>

            {/* Inline memo for depth 0 tasks */}
            {task.depth === 0 && !task.completed && (
              <div className="mt-2">
                <textarea
                  value={task.memo || ""}
                  onChange={(e) => {
                    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, memo: e.target.value } : t));
                  }}
                  placeholder="メモを入力..."
                  className="w-full p-2 bg-white/[0.02] border border-white/[0.04] focus:border-violet-500/30 rounded-lg text-[12px] text-white/50 placeholder:text-white/15 resize-none h-[50px] outline-none transition-colors"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => addSubtask(task.id, task.noteId, task.depth)}
              className="p-1 text-white/20 hover:text-violet-400 hover:bg-violet-500/10 rounded transition-all"
              title="サブタスク追加"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSelectedTask(task)}
              className="p-1 text-white/20 hover:text-white/50 hover:bg-white/[0.04] rounded transition-all"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div className="mt-1">
          {children.map(child => (
            <HierarchicalTaskItem
              key={child.id}
              task={child}
              tasks={tasks}
              setTasks={setTasks}
              collapsedTasks={collapsedTasks}
              toggleCollapse={toggleCollapse}
              handleToggleTask={handleToggleTask}
              setSelectedTask={setSelectedTask}
              addSubtask={addSubtask}
              color={color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Map bucket from DB to local color
const bucketColorMap: Record<string, string> = {
  work: "amber",
  management: "amber",
  rfm: "emerald",
  agent: "violet",
  video: "blue",
  life: "rose",
  boardgame: "cyan",
};

// Convert Item from API to Note for UI
function itemToNote(item: Item): Note {
  const color = bucketColorMap[item.bucket || ""] || "violet";
  return {
    id: item.id,
    title: item.summary || item.body.slice(0, 50) || "Untitled",
    adfContent: item.adf_content || plainTextToADF(item.body),
    bucket: item.bucket || "",
    pinned: item.pinned,
    color,
    updatedAt: new Date(item.updated_at).toLocaleDateString("ja-JP"),
    tags: item.auto_tags || [],
    archived: item.status === "archived",
  };
}

// Version info type
interface VersionInfo {
  commit: string;
  message: string;
  deployedAt: string;
}

// Settings API Keys Component
function SettingsApiKeys() {
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<{ keys: { id: string; name: string; created_at: string; last_used_at: string | null }[] }>({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const res = await fetch("/api/keys");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: (data) => {
      setNewlyCreatedKey(data.key);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("APIキーを作成しました");
    },
    onError: () => {
      toast.error("作成に失敗しました");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("APIキーを削除しました");
    },
    onError: () => {
      toast.error("削除に失敗しました");
    },
  });

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("コピーしました");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold text-white/90 mb-2">APIキー管理</h3>
        <p className="text-[13px] text-white/40 mb-4">
          ClaudeやChatGPTからこのアプリにアクセスするためのAPIキーを管理します。
        </p>
      </div>

      {/* Newly created key */}
      {newlyCreatedKey && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
          <p className="text-[13px] text-emerald-400 font-medium">
            新しいAPIキーが作成されました。このキーは一度しか表示されません。
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-black/40 rounded-lg text-[12px] font-mono text-white/70 overflow-x-auto">
              {showKey ? newlyCreatedKey : "•".repeat(40)}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 text-white/40 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => handleCopy(newlyCreatedKey)}
              className="p-2 text-white/40 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => setNewlyCreatedKey(null)}
            className="text-[12px] text-white/40 hover:text-white/60"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Create new key */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="キー名 (例: Claude Desktop)"
          className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[13px] text-white/80 placeholder:text-white/30 focus:outline-none focus:border-violet-500/50"
        />
        <button
          onClick={() => newKeyName.trim() && createMutation.mutate(newKeyName.trim())}
          disabled={!newKeyName.trim() || createMutation.isPending}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white rounded-xl text-[13px] font-medium transition-all"
        >
          <Plus className="w-4 h-4" />
          作成
        </button>
      </div>

      {/* Key list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-[13px] text-white/40 text-center py-4">読み込み中...</div>
        ) : data?.keys.length === 0 ? (
          <div className="text-[13px] text-white/40 text-center py-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
            APIキーがありません
          </div>
        ) : (
          data?.keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]"
            >
              <div>
                <p className="text-[14px] text-white/80 font-medium">{key.name}</p>
                <p className="text-[12px] text-white/40">
                  作成: {new Date(key.created_at).toLocaleDateString("ja-JP")}
                  {key.last_used_at && (
                    <> • 最終使用: {new Date(key.last_used_at).toLocaleDateString("ja-JP")}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(key.id)}
                disabled={deleteMutation.isPending}
                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function PrototypePage() {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [tasks, setTasks] = useState(mockTasks);
  const [showArchived, setShowArchived] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"account" | "apikeys" | "mcp" | "preferences">("account");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Fetch version info and user info on mount
  useEffect(() => {
    fetch("/api/version")
      .then(res => res.json())
      .then(data => setVersionInfo(data))
      .catch(() => {});

    // Get user info
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null);
    });
  }, []);

  // API hooks
  const { data: itemsData, isLoading, error } = useItems({ status: showArchived ? "archived" : "active" });
  const updateItem = useUpdateItem();
  const createItem = useCreateItem();
  const archiveItemMutation = useArchiveItem();
  const unarchiveItemMutation = useUnarchiveItem();
  const pinItemMutation = usePinItem();
  const deleteItemMutation = useDeleteItem();

  // Convert API items to notes
  const notes = useMemo(() => {
    if (!itemsData?.items) return [];
    return itemsData.items.map(itemToNote);
  }, [itemsData?.items]);
  const [editingContent, setEditingContent] = useState("");
  const [editingMedia, setEditingMedia] = useState<EmbeddedMedia[]>([]);
  const [editingTitle, setEditingTitle] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [showMediaModal, setShowMediaModal] = useState<"image" | "link" | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverTask, setDragOverTask] = useState<string | null>(null);
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [dragOverBucket, setDragOverBucket] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = editorRef as unknown as React.RefObject<HTMLTextAreaElement>; // Legacy compatibility

  // タスクの折りたたみをトグル
  const toggleCollapse = useCallback((taskId: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // サブタスクを追加
  const addSubtask = useCallback((parentId: string, noteId: string, parentDepth: number) => {
    const newTask: Task = {
      id: `t${Date.now()}`,
      title: "新しいサブタスク",
      noteId,
      dueDate: null,
      completed: false,
      memo: "",
      parentId,
      depth: parentDepth + 1,
    };
    setTasks(prev => [...prev, newTask]);
  }, []);

  // メディアを追加（カーソル位置に挿入）
  const addMedia = useCallback((media: EmbeddedMedia) => {
    setEditingMedia(prev => [...prev, media]);

    const editor = editorRef.current;
    if (editor) {
      if (media.type === "image") {
        // 画像要素を作成してカーソル位置に挿入
        const img = document.createElement("img");
        img.src = media.url;
        img.alt = media.title || "画像";
        img.className = "max-w-full max-h-[300px] rounded-lg border border-white/[0.08] inline-block my-2 cursor-pointer";
        img.onclick = () => setLightboxImage(media.url);

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createElement("br"));
          range.insertNode(img);
          range.insertNode(document.createElement("br"));
          range.setStartAfter(img);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          editor.appendChild(document.createElement("br"));
          editor.appendChild(img);
          editor.appendChild(document.createElement("br"));
        }
      } else {
        // リンクの場合
        const link = document.createElement("a");
        link.href = media.url;
        link.textContent = media.title || media.url;
        link.className = "text-violet-400 hover:underline";
        link.target = "_blank";

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(link);
          range.setStartAfter(link);
          range.collapse(true);
        } else {
          editor.appendChild(link);
        }
      }
      // 状態を更新
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, []);

  // メディアを削除
  const removeMedia = useCallback((mediaId: string) => {
    setEditingMedia(prev => prev.filter(m => m.id !== mediaId));
  }, []);

  // 画像ペースト処理
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const newMedia: EmbeddedMedia = {
              id: `m-${Date.now()}`,
              type: "image",
              url: dataUrl,
              title: `画像 ${new Date().toLocaleTimeString("ja-JP")}`,
              position: editingMedia.length,
            };
            addMedia(newMedia);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, [editingMedia.length, addMedia]);

  // ファイル選択処理 - Supabase Storageにアップロード
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      try {
        // FormDataを作成してAPIに送信
        const formData = new FormData();
        formData.append("file", file);
        if (selectedNote?.id) {
          formData.append("item_id", selectedNote.id);
        }

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const { url } = await response.json();
        const newMedia: EmbeddedMedia = {
          id: `m-${Date.now()}`,
          type: "image",
          url,
          title: file.name,
          position: editingMedia.length,
        };
        addMedia(newMedia);
        toast.success("画像をアップロードしました");
      } catch (err) {
        console.error("Image upload failed:", err);
        toast.error("画像のアップロードに失敗しました");
      }
    }
    e.target.value = "";
  }, [editingMedia.length, addMedia, selectedNote?.id]);

  // メディア追加（モーダルから）
  const handleAddMedia = useCallback(() => {
    if (!mediaUrl) return;

    try {
      const newMedia: EmbeddedMedia = {
        id: `m-${Date.now()}`,
        type: showMediaModal!,
        url: mediaUrl,
        title: mediaTitle || new URL(mediaUrl).hostname,
        description: showMediaModal === "link" ? new URL(mediaUrl).hostname : undefined,
        position: editingMedia.length,
      };
      addMedia(newMedia);
    } catch {
      // Invalid URL
    }
    setShowMediaModal(null);
    setMediaUrl("");
    setMediaTitle("");
  }, [mediaUrl, mediaTitle, showMediaModal, editingMedia.length, addMedia]);

  // 新規ノート作成
  const handleCreateNote = useCallback(async () => {
    try {
      const newItem = await createItem.mutateAsync({
        body: "新しいノート",
        bucket: (selectedBucket as Bucket) || undefined,
      });
      const note = itemToNote(newItem);
      handleOpenNote(note);
      toast.success("新しいノートを作成しました");
    } catch (err) {
      console.error("Create failed:", err);
      toast.error("ノートの作成に失敗しました");
    }
  }, [createItem, selectedBucket]);

  // アーカイブ/復元トグル
  const handleArchiveNote = useCallback(async (noteId: string, isArchived: boolean) => {
    try {
      if (isArchived) {
        await unarchiveItemMutation.mutateAsync(noteId);
        toast.success("アーカイブを解除しました");
      } else {
        await archiveItemMutation.mutateAsync(noteId);
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
        }
        toast.success("アーカイブしました");
      }
    } catch (err) {
      console.error("Archive/Unarchive failed:", err);
      toast.error("操作に失敗しました");
    }
  }, [archiveItemMutation, unarchiveItemMutation, selectedNote]);

  // ピントグル
  const handlePinNote = useCallback(async (noteId: string, isPinned: boolean) => {
    try {
      await pinItemMutation.mutateAsync({ id: noteId, pinned: !isPinned });
      toast.success(isPinned ? "ピンを解除しました" : "ピン留めしました");
    } catch (err) {
      console.error("Pin failed:", err);
      toast.error("操作に失敗しました");
    }
  }, [pinItemMutation]);

  // 削除
  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      await deleteItemMutation.mutateAsync(noteId);
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
      toast.success("ノートを削除しました");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("削除に失敗しました");
    }
  }, [deleteItemMutation, selectedNote]);

  // オートセーブ
  useEffect(() => {
    if (!selectedNote) return;

    // 変更があったらsaving状態に
    setSaveStatus("saving");

    // デバウンス: 500ms後に保存
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      // プレーンテキストをADF形式に変換して保存
      const newAdfContent = plainTextToADF(editingContent);
      try {
        await updateItem.mutateAsync({
          id: selectedNote.id,
          body: editingContent,
          summary: editingTitle || null,
          adf_content: newAdfContent,
        });
        setSaveStatus("saved");
        // 2秒後にidle状態に
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Save failed:", err);
        setSaveStatus("idle");
        toast.error("保存に失敗しました");
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTitle, editingContent, editingMedia, selectedNote?.id]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: 検索
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      // Cmd/Ctrl + N: 新規ノート
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleCreateNote();
      }
      // Escape: 閉じる
      if (e.key === "Escape") {
        if (lightboxImage) {
          setLightboxImage(null);
        } else if (showMediaModal) {
          setShowMediaModal(null);
        } else if (selectedTask) {
          setSelectedTask(null);
        } else if (showSearch) {
          setShowSearch(false);
        } else if (selectedNote) {
          handleCloseNote();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNote, selectedTask, showSearch, lightboxImage, showMediaModal, handleCreateNote]);

  // ノート間リンクをクリックで開く
  const handleNoteLinkClick = useCallback((noteTitle: string) => {
    const linkedNote = notes.find(n => n.title === noteTitle);
    if (linkedNote) {
      if (selectedNote) {
        // 現在のノートを保存してから開く（プレーンテキストをADFに変換）
        const newAdfContent = plainTextToADF(editingContent);
        updateItem.mutate({
          id: selectedNote.id,
          body: editingContent,
          summary: editingTitle || null,
          adf_content: newAdfContent,
        });
      }
      handleOpenNote(linkedNote);
    }
  }, [notes, selectedNote, editingTitle, editingContent]);

  // Markdownレンダリング用ヘルパー
  const renderMarkdown = useCallback((text: string) => {
    // 見出し
    let html = text.replace(/^## (.+)$/gm, '<span class="text-[18px] font-bold text-white/80">$1</span>');
    html = html.replace(/^# (.+)$/gm, '<span class="text-[22px] font-bold text-white/90">$1</span>');
    // 太字
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white/80">$1</strong>');
    // リスト（・で始まる行はそのまま）
    // インラインコード
    html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-white/[0.08] rounded text-[14px] text-violet-300">$1</code>');
    return html;
  }, []);

  // タスクのドラッグ&ドロップハンドラー
  const handleTaskDragStart = useCallback((taskId: string) => {
    setDraggedTask(taskId);
  }, []);

  const handleTaskDragOver = useCallback((e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask !== taskId) {
      setDragOverTask(taskId);
    }
  }, [draggedTask]);

  const handleTaskDrop = useCallback((targetTaskId: string) => {
    if (!draggedTask || draggedTask === targetTaskId) return;

    const draggedIndex = tasks.findIndex(t => t.id === draggedTask);
    const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newTasks = [...tasks];
    const [removed] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, removed);

    setTasks(newTasks);
    setDraggedTask(null);
    setDragOverTask(null);
  }, [draggedTask, tasks]);

  // ノートのドラッグ&ドロップハンドラー
  const handleNoteDragStart = useCallback((noteId: string) => {
    setDraggedNote(noteId);
  }, []);

  const handleNoteDragOver = useCallback((e: React.DragEvent, bucketId: string | null) => {
    e.preventDefault();
    setDragOverBucket(bucketId);
  }, []);

  const handleNoteDrop = useCallback((bucketId: string | null) => {
    if (!draggedNote || !bucketId) return;

    updateItem.mutate({
      id: draggedNote,
      bucket: bucketId as Bucket || null,
    });
    setDraggedNote(null);
    setDragOverBucket(null);
  }, [draggedNote]);

  const filteredNotes = useMemo(() => notes.filter(n => {
    if (!showArchived && n.archived) return false;
    if (showArchived && !n.archived) return false;
    if (selectedBucket && n.bucket !== selectedBucket) return false;
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }), [notes, selectedBucket, searchQuery, showArchived]);

  const incompleteTasks = tasks.filter(t => !t.completed);

  // handleOpenNoteはuseCallbackの外で使うため、ここで定義
  const handleOpenNoteRef = useRef<(note: Note) => void>(() => {});
  handleOpenNoteRef.current = (note: Note) => {
    setSelectedNote(note);
    setEditingTitle(note.title);
    // ADF形式からMarkdown形式に変換して編集用に設定
    setEditingContent(adfToPlainText(note.adfContent));
    setEditingMedia([]);
    setSelection(null);
    setSaveStatus("idle");
  };

  const handleOpenNote = useCallback((note: Note) => {
    handleOpenNoteRef.current(note);
  }, []);

  // エディタの内容を初期化（ノートを開いた時）
  const editorInitializedRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedNote && editorRef.current && editorInitializedRef.current !== selectedNote.id) {
      editorInitializedRef.current = selectedNote.id;
      const content = adfToPlainText(selectedNote.adfContent);
      // MarkdownをHTMLに変換してエディタに設定
      const html = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) =>
          `<img src="${url}" alt="${alt || "画像"}" class="max-w-full max-h-[300px] rounded-lg border border-white/[0.08] inline-block my-2 cursor-pointer" />`
        )
        .replace(/\n/g, "<br />");
      editorRef.current.innerHTML = html || "";
    }
    if (!selectedNote) {
      editorInitializedRef.current = null;
    }
  }, [selectedNote]);

  const handleCloseNote = useCallback(() => {
    // オートセーブで既に保存されているため、ここでの保存は不要
    setSelectedNote(null);
    setEditingMedia([]);
    setSelection(null);
    setSaveStatus("idle");
  }, []);

  const handleTextSelect = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    setSelection(text || null);
  };

  const handleCreateTask = () => {
    if (!selection) return;
    const newTask: Task = {
      id: `t${Date.now()}`,
      title: selection,
      noteId: selectedNote?.id || "",
      dueDate: null,
      completed: false,
      memo: "",
      parentId: null,
      depth: 0,
    };
    setTasks([newTask, ...tasks]);
    setSelection(null);
  };

  const handleGenerateTags = async () => {
    if (!selectedNote) return;
    setIsGeneratingTags(true);
    // Simulate AI tag generation
    await new Promise(r => setTimeout(r, 1500));
    const newTags = ["auto-tag", "ai-generated"];
    // Tags are managed by the backend, no local update needed
    setSelectedNote({ ...selectedNote, tags: [...new Set([...selectedNote.tags, ...newTags])] });
    setIsGeneratingTags(false);
  };

  const handleToggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Full-screen editor
  if (selectedNote) {
    const color = colorConfig[selectedNote.color] || colorConfig.violet;

    return (
      <div className="fixed inset-0 bg-[#09090b] z-50">
        {/* Ambient glow */}
        <div className={cn("fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-20 pointer-events-none", color.bg)} />

        <div className="h-full flex">
          {/* Sidebar - 空白クリックで戻る */}
          <aside
            onClick={handleCloseNote}
            className="w-72 border-r border-white/[0.04] p-5 hidden lg:flex flex-col bg-black/20 cursor-pointer"
          >
            {/* 大きな戻るボタン */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCloseNote(); }}
              className="flex items-center gap-3 px-4 py-3 -mx-2 mb-6 text-[14px] text-white/50 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">ノート一覧に戻る</span>
            </button>

            <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
              <div>
                <p className="text-[11px] font-medium text-white/30 uppercase tracking-widest mb-3">Properties</p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-white/40">Bucket</span>
                    <span className="text-[13px] text-white/70 capitalize bg-white/[0.04] px-2 py-0.5 rounded">{selectedNote.bucket}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-white/40">Updated</span>
                    <span className="text-[13px] text-white/70">{selectedNote.updatedAt}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-medium text-white/30 uppercase tracking-widest">Tags</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedNote.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-white/[0.04] text-white/50 text-[11px] rounded-lg border border-white/[0.04] hover:border-white/[0.08] hover:text-white/70 transition-colors cursor-default">
                      #{tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={handleGenerateTags}
                  disabled={isGeneratingTags}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-300",
                    isGeneratingTags
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      : "bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 text-violet-400 border border-violet-500/20 hover:border-violet-500/40 hover:from-violet-500/20 hover:to-fuchsia-500/20"
                  )}
                >
                  {isGeneratingTags ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Auto-generate tags
                    </>
                  )}
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-medium text-white/30 uppercase tracking-widest">Tasks</p>
                  <span className="text-[10px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded">
                    {tasks.filter(t => t.noteId === selectedNote.id && !t.completed).length} / {tasks.filter(t => t.noteId === selectedNote.id).length}
                  </span>
                </div>

                {/* タスク一覧（メモ付き） */}
                <div className="space-y-2">
                  {tasks.filter(t => t.noteId === selectedNote.id && !t.completed).map(task => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-2.5 -mx-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] cursor-pointer transition-all group"
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id); }}
                          className="mt-0.5 w-[16px] h-[16px] rounded-md border-2 border-white/15 hover:border-violet-400 transition-all flex-shrink-0 flex items-center justify-center"
                        >
                          <Check className="w-2 h-2 text-violet-400 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-white/70 leading-snug group-hover:text-white/90 transition-colors">{task.title}</p>
                          {task.memo && (
                            <p className="text-[10px] text-white/30 mt-1 line-clamp-2">{task.memo}</p>
                          )}
                          {task.dueDate && (
                            <span className={cn(
                              "text-[9px] mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded",
                              task.dueDate === "今日" ? "text-rose-400 bg-rose-500/10" : "text-white/25 bg-white/[0.03]"
                            )}>
                              <Calendar className="w-2 h-2" />
                              {task.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 完了済み */}
                  {tasks.filter(t => t.noteId === selectedNote.id && t.completed).length > 0 && (
                    <div className="pt-2 mt-2 border-t border-white/[0.04]">
                      <p className="text-[9px] text-white/20 mb-1.5">完了済み</p>
                      {tasks.filter(t => t.noteId === selectedNote.id && t.completed).map(task => (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="flex items-center gap-2 py-1.5 px-1 -mx-1 rounded hover:bg-white/[0.02] cursor-pointer transition-all"
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id); }}
                            className="w-[14px] h-[14px] rounded bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"
                          >
                            <Check className="w-2 h-2 text-violet-400" strokeWidth={3} />
                          </button>
                          <span className="text-[11px] text-white/25 line-through">{task.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {tasks.filter(t => t.noteId === selectedNote.id).length === 0 && (
                    <p className="text-[11px] text-white/20 py-3 text-center">テキストを選択してタスクを作成</p>
                  )}
                </div>
              </div>
            </div>

            {/* 空白クリックのヒント */}
            <div className="flex-1" />
            <p className="text-[10px] text-white/15 text-center py-4">クリックで一覧に戻る</p>
          </aside>

          {/* Editor */}
          <main className="flex-1 flex flex-col min-w-0">
            <header className="flex items-center justify-between px-4 py-2 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                {/* モバイル用の大きな戻るボタン */}
                <button
                  onClick={handleCloseNote}
                  className="lg:hidden flex items-center gap-2 px-3 py-2 -ml-2 text-[13px] text-white/50 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>戻る</span>
                </button>
                {/* PC用のパンくず + バケット選択 */}
                <div className="hidden lg:flex items-center gap-2 text-[13px] text-white/30">
                  <select
                    value={selectedNote.bucket || ""}
                    onChange={async (e) => {
                      const newBucket = e.target.value || null;
                      try {
                        await updateItem.mutateAsync({
                          id: selectedNote.id,
                          bucket: newBucket as Bucket | null,
                        });
                        setSelectedNote({ ...selectedNote, bucket: newBucket });
                        toast.success("グループを変更しました");
                      } catch {
                        toast.error("変更に失敗しました");
                      }
                    }}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-[12px] text-white/60 hover:text-white/80 cursor-pointer focus:outline-none focus:border-violet-500/50 capitalize"
                  >
                    <option value="">グループなし</option>
                    {buckets.filter(b => b.id).map(bucket => (
                      <option key={bucket.id} value={bucket.id!} className="capitalize">
                        {bucket.label}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-white/60 truncate max-w-[200px]">{editingTitle || "Untitled"}</span>
                </div>
                {/* オートセーブインジケーター */}
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] transition-all duration-300",
                  saveStatus === "saving" && "text-amber-400 bg-amber-500/10",
                  saveStatus === "saved" && "text-emerald-400 bg-emerald-500/10",
                  saveStatus === "idle" && "text-white/20"
                )}>
                  {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" />保存中...</>}
                  {saveStatus === "saved" && <><Check className="w-3 h-3" />保存済み</>}
                  {saveStatus === "idle" && <><Clock className="w-3 h-3" />自動保存</>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* アーカイブボタン */}
                <button
                  onClick={() => handleArchiveNote(selectedNote.id, selectedNote.archived)}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    selectedNote.archived ? "text-violet-400 bg-violet-500/10" : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                  )}
                  title={selectedNote.archived ? "アーカイブ解除" : "アーカイブ"}
                >
                  {selectedNote.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handlePinNote(selectedNote.id, selectedNote.pinned)}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    selectedNote.pinned ? "text-amber-400 bg-amber-500/10" : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                  )}
                  title={selectedNote.pinned ? "ピン解除" : "ピン留め"}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button className="p-2 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {/* 閉じるボタン + ESCヒント */}
                <button
                  onClick={handleCloseNote}
                  className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all"
                >
                  <span className="text-[11px]">ESC</span>
                  <X className="w-4 h-4" />
                </button>
                <button onClick={handleCloseNote} className="lg:hidden p-2 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* 背景クリックで戻る */}
            <div
              className="flex-1 overflow-auto"
              onClick={(e) => {
                // クリックがコンテンツ要素の外側の場合のみ戻る
                if (e.target === e.currentTarget) {
                  handleCloseNote();
                }
              }}
            >
              <div
                className="max-w-2xl mx-auto px-6 lg:px-8 py-12"
                onClick={(e) => {
                  // 最大幅コンテナの外側クリックで戻る
                  const rect = e.currentTarget.getBoundingClientRect();
                  const isOutsideContent = e.clientX < rect.left || e.clientX > rect.right;
                  if (isOutsideContent) {
                    handleCloseNote();
                  }
                }}
              >
                {/* Color indicator */}
                <div className="flex items-center gap-3 mb-6" onClick={e => e.stopPropagation()}>
                  <div className={cn("w-3 h-3 rounded-full shadow-lg", color.dot, color.glow)} />
                  <span className="text-[11px] text-white/30 uppercase tracking-widest font-medium">{selectedNote.bucket}</span>
                </div>

                {/* Title */}
                <input
                  type="text"
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="w-full text-[32px] font-bold bg-transparent outline-none placeholder:text-white/10 text-white/95 leading-tight tracking-tight"
                  placeholder="Untitled"
                />

                {/* Content - Rich Editor with Inline Images */}
                <div className="mt-8" onClick={e => e.stopPropagation()}>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-[200px] text-white/80 text-[16px] leading-[1.9] outline-none whitespace-pre-wrap empty:before:content-['ここにメモを書く...'] empty:before:text-white/20"
                    style={{ wordBreak: "break-word" }}
                    onInput={e => {
                      const div = e.currentTarget;
                      // Convert HTML back to Markdown
                      let content = "";
                      const processNode = (node: ChildNode) => {
                        if (node.nodeType === Node.TEXT_NODE) {
                          content += node.textContent;
                        } else if (node.nodeName === "IMG") {
                          const img = node as HTMLImageElement;
                          content += `![${img.alt || "画像"}](${img.src})`;
                        } else if (node.nodeName === "BR") {
                          content += "\n";
                        } else if (node.nodeName === "DIV" || node.nodeName === "P") {
                          if (content && !content.endsWith("\n")) content += "\n";
                          node.childNodes.forEach(processNode);
                        } else if (node.nodeName === "A") {
                          const a = node as HTMLAnchorElement;
                          content += `[${a.textContent || a.href}](${a.href})`;
                        } else {
                          node.childNodes.forEach(processNode);
                        }
                      };
                      div.childNodes.forEach(processNode);
                      setEditingContent(content.replace(/^\n/, ""));
                    }}
                    onPaste={e => {
                      const items = e.clipboardData.items;
                      for (const item of items) {
                        if (item.type.startsWith("image/")) {
                          e.preventDefault();
                          const file = item.getAsFile();
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const dataUrl = event.target?.result as string;
                              // Insert image at cursor
                              const img = document.createElement("img");
                              img.src = dataUrl;
                              img.alt = `画像 ${new Date().toLocaleTimeString("ja-JP")}`;
                              img.className = "max-w-full max-h-[300px] rounded-lg border border-white/[0.08] inline-block my-2 cursor-pointer";
                              img.onclick = () => setLightboxImage(dataUrl);
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
                              // Trigger input event to update state
                              editorRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
                            };
                            reader.readAsDataURL(file);
                          }
                          return;
                        }
                      }
                    }}
                    onMouseUp={handleTextSelect}
                    onKeyUp={handleTextSelect}
                  />
                </div>

                {/* Media Toolbar - Floating */}
                <div className="sticky bottom-4 mt-8" onClick={e => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-1 p-1.5 bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-xl">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="hidden sm:inline">画像</span>
                    </button>
                    <button
                      onClick={() => setShowMediaModal("image")}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all"
                    >
                      <Image className="w-4 h-4" />
                      <span className="hidden sm:inline">URL</span>
                    </button>
                    <button
                      onClick={() => setShowMediaModal("link")}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/50 hover:text-white hover:bg-white/[0.08] rounded-lg transition-all"
                    >
                      <Link2 className="w-4 h-4" />
                      <span className="hidden sm:inline">リンク</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Inline Task Management Section - Hierarchical */}
                <div className="mt-12 pt-8 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", color.bg)}>
                        <Check className={cn("w-4 h-4", color.text)} />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-semibold text-white/90">タスク管理</h4>
                        <p className="text-[12px] text-white/30">
                          {tasks.filter(t => t.noteId === selectedNote.id).length > 0
                            ? `${tasks.filter(t => t.noteId === selectedNote.id && t.completed).length} / ${tasks.filter(t => t.noteId === selectedNote.id).length} 完了`
                            : "タスクはありません"
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newTask: Task = {
                          id: `t${Date.now()}`,
                          title: "新しいタスク",
                          noteId: selectedNote.id,
                          dueDate: null,
                          completed: false,
                          memo: "",
                          parentId: null,
                          depth: 0,
                        };
                        setTasks([...tasks, newTask]);
                        toast.success("タスクを追加しました");
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded-lg transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      タスク追加
                    </button>
                  </div>

                  {/* Hierarchical Task List */}
                  {tasks.filter(t => t.noteId === selectedNote.id).length > 0 ? (
                    <div className="space-y-1">
                      {getRootTasks(tasks, selectedNote.id).map(task => (
                        <HierarchicalTaskItem
                          key={task.id}
                          task={task}
                          tasks={tasks}
                          setTasks={setTasks}
                          collapsedTasks={collapsedTasks}
                          toggleCollapse={toggleCollapse}
                          handleToggleTask={handleToggleTask}
                          setSelectedTask={setSelectedTask}
                          addSubtask={addSubtask}
                          color={color}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.02] flex items-center justify-center mb-3">
                        <Check className="w-6 h-6 text-white/20" />
                      </div>
                      <p className="text-[13px] text-white/30">タスクを追加して進捗を管理しましょう</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selection toolbar */}
            {selection && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full" />

                <div className="relative flex items-center gap-1.5 p-1.5 bg-[#18181b]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60">
                  <button
                    onClick={handleCreateTask}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white text-[13px] font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25"
                  >
                    <Check className="w-4 h-4" />
                    Create task
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/[0.08] text-[13px] font-medium rounded-xl transition-all duration-200">
                    <Sparkles className="w-4 h-4" />
                    Ask AI
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/[0.08] text-[13px] font-medium rounded-xl transition-all duration-200">
                    <Calendar className="w-4 h-4" />
                    Set due
                  </button>
                  <div className="w-px h-6 bg-white/[0.08] mx-1" />
                  <button onClick={() => setSelection(null)} className="p-2.5 text-white/30 hover:text-white/60 hover:bg-white/[0.06] rounded-xl transition-all duration-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <footer className="px-6 py-3 border-t border-white/[0.04] flex items-center justify-between bg-[#09090b]/50">
              <div className="flex items-center gap-4 text-[11px] text-white/20">
                <span>{editingContent.length} chars</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>Last saved {selectedNote.updatedAt}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleArchiveNote(selectedNote.id, selectedNote.archived)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-white/25 hover:text-white/50 hover:bg-white/[0.04] rounded-lg transition-all"
                >
                  {selectedNote.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  {selectedNote.archived ? "Unarchive" : "Archive"}
                </button>
                <button
                  onClick={() => {
                    if (confirm("このノートを削除しますか？この操作は取り消せません。")) {
                      handleDeleteNote(selectedNote.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-white/25 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </footer>
          </main>
        </div>

        {/* Media Modal */}
        {showMediaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowMediaModal(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
              className="relative w-full max-w-md bg-[#141417] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h3 className="text-[16px] font-semibold text-white/90 flex items-center gap-2">
                  {showMediaModal === "image" ? <Image className="w-5 h-5 text-violet-400" /> : <Link2 className="w-5 h-5 text-violet-400" />}
                  {showMediaModal === "image" ? "画像URLを追加" : "リンクを追加"}
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[12px] text-white/40 mb-2">URL</label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                    placeholder={showMediaModal === "image" ? "https://example.com/image.jpg" : "https://example.com"}
                    className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] focus:border-violet-500/50 rounded-xl text-[14px] text-white/90 placeholder:text-white/20 outline-none transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-white/40 mb-2">タイトル（任意）</label>
                  <input
                    type="text"
                    value={mediaTitle}
                    onChange={e => setMediaTitle(e.target.value)}
                    placeholder="添付ファイルのタイトル"
                    className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] focus:border-violet-500/50 rounded-xl text-[14px] text-white/90 placeholder:text-white/20 outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
                <button
                  onClick={() => setShowMediaModal(null)}
                  className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] rounded-lg transition-all"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddMedia}
                  disabled={!mediaUrl}
                  className="px-4 py-2 bg-violet-500 hover:bg-violet-400 disabled:bg-white/[0.04] disabled:text-white/20 text-white text-[13px] font-medium rounded-lg transition-all"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox */}
        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setLightboxImage(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/[0.1] rounded-lg transition-all"
              onClick={() => setLightboxImage(null)}
            >
              <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-violet-500/30">
      {/* Background - シンプルに */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f12] to-[#0a0a0b]" />
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/[0.04] p-4 hidden lg:flex flex-col z-20 bg-[#09090b]/90 backdrop-blur-2xl">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-2 mb-6">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 blur-lg opacity-40" />
          </div>
          <div>
            <span className="font-bold text-[16px] tracking-tight">Capture</span>
            <p className="text-[10px] text-white/30 -mt-0.5">AI-powered notes</p>
          </div>
        </div>

        {/* Search */}
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] text-white/30 hover:text-white/50 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] rounded-xl transition-all mb-3 group"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="flex items-center gap-0.5 text-[10px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded-md font-mono group-hover:text-white/30">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        {/* New Note Button */}
        <button
          onClick={handleCreateNote}
          className="relative flex items-center justify-center gap-2 w-full px-3 py-3 bg-gradient-to-r from-white to-white/95 text-[#09090b] text-[13px] font-semibold rounded-xl hover:from-white hover:to-white transition-all shadow-lg shadow-white/10 mb-4 group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="w-4 h-4 relative" />
          <span className="relative">New Note</span>
          <kbd className="relative text-[10px] text-black/40 bg-black/10 px-1.5 py-0.5 rounded font-mono ml-1">
            <Command className="w-2.5 h-2.5 inline" />N
          </kbd>
        </button>

        {/* Archive Toggle */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[12px] transition-all mb-4",
            showArchived
              ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
              : "text-white/30 hover:text-white/50 hover:bg-white/[0.03]"
          )}
        >
          <Archive className="w-4 h-4" />
          <span>{showArchived ? "アーカイブ表示中" : "アーカイブを表示"}</span>
          {notes.filter(n => n.archived).length > 0 && (
            <span className="ml-auto text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded">
              {notes.filter(n => n.archived).length}
            </span>
          )}
        </button>

        {/* Navigation */}
        <nav className="space-y-1">
          {buckets.map(({ id, label, icon: Icon, color }) => {
            const count = id
              ? notes.filter(n => n.bucket === id && (showArchived ? n.archived : !n.archived)).length
              : notes.filter(n => showArchived ? n.archived : !n.archived).length;
            const isActive = selectedBucket === id;
            return (
              <button
                key={id || "all"}
                onClick={() => setSelectedBucket(id)}
                onDragOver={(e) => id && handleNoteDragOver(e, id)}
                onDrop={() => id && handleNoteDrop(id)}
                onDragLeave={() => setDragOverBucket(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200",
                  isActive
                    ? "bg-white/[0.08] text-white shadow-sm"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]",
                  dragOverBucket === id && "bg-violet-500/20 border-2 border-dashed border-violet-500/50"
                )}
              >
                <Icon className={cn("w-4 h-4 transition-colors", isActive ? color : "text-white/30")} />
                <span className="flex-1 text-left">{label}</span>
                <span className={cn(
                  "text-[11px] tabular-nums px-1.5 py-0.5 rounded transition-colors",
                  isActive ? "bg-white/10 text-white/70" : "text-white/20"
                )}>{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent my-5" />

        {/* Tasks Section - Hierarchical */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">Tasks</span>
            <span className="text-[11px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full font-medium">{incompleteTasks.length}</span>
          </div>

          {/* タスク追加ボタン */}
          <button className="mx-2 mb-2 flex items-center gap-2 px-3 py-2 text-[12px] text-white/30 hover:text-white/60 hover:bg-white/[0.03] rounded-lg transition-all border border-dashed border-white/[0.06] hover:border-white/[0.12]">
            <Plus className="w-3.5 h-3.5" />
            <span>タスクを追加</span>
          </button>

          <div className="flex-1 overflow-y-auto space-y-0.5 px-1">
            {/* Root tasks only in sidebar */}
            {getRootTasks(tasks).filter(t => !t.completed).map(task => {
              const relatedNote = notes.find(n => n.id === task.noteId);
              const noteColor = relatedNote ? colorConfig[relatedNote.color] : null;
              const children = getChildTasks(tasks, task.id);
              const hasChildren = children.length > 0;
              const progress = getTaskProgress(tasks, task.id);
              const isCollapsed = collapsedTasks.has(task.id);

              return (
                <div key={task.id}>
                  <div
                    onClick={() => setSelectedTask(task)}
                    className={cn(
                      "group flex items-start gap-2 px-2 py-2 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-all",
                      selectedTask?.id === task.id && "bg-violet-500/10 border border-violet-500/20"
                    )}
                  >
                    {/* Collapse toggle */}
                    <div className="w-4 flex-shrink-0 flex items-center justify-center mt-1">
                      {hasChildren ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCollapse(task.id); }}
                          className="p-0.5 text-white/20 hover:text-white/50 rounded transition-all"
                        >
                          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      ) : null}
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id); }}
                      className="mt-0.5 w-[16px] h-[16px] rounded-md border-2 border-white/15 hover:border-violet-400 hover:bg-violet-500/10 transition-all flex-shrink-0 flex items-center justify-center group/check"
                    >
                      <Check className="w-2 h-2 text-violet-400 opacity-0 group-hover/check:opacity-100 transition-opacity" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] text-white/60 leading-snug group-hover:text-white/90 transition-colors">{task.title}</p>
                        {hasChildren && progress.total > 0 && (
                          <span className="text-[9px] text-white/25 bg-white/[0.04] px-1 py-0.5 rounded">
                            {progress.completed}/{progress.total}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.dueDate && (
                          <span className={cn(
                            "text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded",
                            task.dueDate === "今日"
                              ? "text-rose-400 bg-rose-500/10"
                              : "text-white/30 bg-white/[0.03]"
                          )}>
                            <Calendar className="w-2.5 h-2.5" />
                            {task.dueDate}
                          </span>
                        )}
                        {relatedNote && (
                          <span className={cn(
                            "text-[9px] inline-flex items-center gap-1 px-1 py-0.5 rounded",
                            noteColor?.bg || "bg-white/[0.03]",
                            noteColor?.text || "text-white/30"
                          )}>
                            {relatedNote.title.slice(0, 6)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Child tasks */}
                  {hasChildren && !isCollapsed && (
                    <div className="ml-6 mt-0.5 space-y-0.5">
                      {children.filter(c => !c.completed).map(child => (
                        <div
                          key={child.id}
                          onClick={() => setSelectedTask(child)}
                          className="group flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-all"
                        >
                          <CornerDownRight className="w-3 h-3 text-white/10 mt-0.5 flex-shrink-0" />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleTask(child.id); }}
                            className="mt-0.5 w-[14px] h-[14px] rounded border-2 border-white/15 hover:border-violet-400 transition-all flex-shrink-0 flex items-center justify-center"
                          >
                            <Check className="w-2 h-2 text-violet-400 opacity-0 group-hover:opacity-50 transition-opacity" />
                          </button>
                          <span className="text-[12px] text-white/50 group-hover:text-white/70 transition-colors">{child.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 完了済みタスク */}
            {tasks.filter(t => t.completed).length > 0 && (
              <div className="pt-3 mt-2 border-t border-white/[0.04]">
                <p className="text-[10px] text-white/20 px-2 mb-1">完了済み ({tasks.filter(t => t.completed).length})</p>
                {tasks.filter(t => t.completed && t.depth === 0).slice(0, 3).map(task => (
                  <div key={task.id} className="group flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-all">
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="w-[14px] h-[14px] rounded-md bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"
                    >
                      <Check className="w-2 h-2 text-violet-400" strokeWidth={3} />
                    </button>
                    <span className="text-[11px] text-white/25 line-through">{task.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings Section */}
        <div className="border-t border-white/[0.04] pt-4 mt-4">
          <p className="text-[10px] text-white/25 uppercase tracking-widest px-3 mb-2 font-medium">Settings</p>
          <div className="space-y-0.5">
            <button
              onClick={() => { setSettingsTab("account"); setShowSettings(true); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-all group"
            >
              <User className="w-4 h-4" />
              <span className="flex-1 text-left">Account</span>
            </button>
            <button
              onClick={() => { setSettingsTab("apikeys"); setShowSettings(true); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-all group"
            >
              <Key className="w-4 h-4" />
              <span className="flex-1 text-left">API Keys</span>
            </button>
            <button
              onClick={() => { setSettingsTab("mcp"); setShowSettings(true); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] hover:bg-violet-500/10 transition-all group"
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="flex-1 text-left text-violet-400">MCP連携</span>
            </button>
            <button
              onClick={() => { setSettingsTab("preferences"); setShowSettings(true); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-white/40 hover:text-white/70 hover:bg-white/[0.03] transition-all group"
            >
              <Settings className="w-4 h-4" />
              <span className="flex-1 text-left">Preferences</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:pl-64 min-h-screen">
        <header className="sticky top-0 z-10 px-5 lg:px-6 py-4 bg-[#09090b]/80 backdrop-blur-2xl border-b border-white/[0.04]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-[17px] font-semibold text-white/95 tracking-tight">
                {selectedBucket ? buckets.find(b => b.id === selectedBucket)?.label : "All Notes"}
              </h1>
              <span className="text-[12px] text-white/25 bg-white/[0.03] px-2.5 py-1 rounded-lg">
                {filteredNotes.length} notes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSearch(true)} className="lg:hidden p-2.5 hover:bg-white/[0.04] rounded-xl transition-colors">
                <Search className="w-5 h-5 text-white/40" />
              </button>
            </div>
          </div>
        </header>

        <div className="p-5 lg:p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                <p className="text-white/40 text-sm">読み込み中...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <X className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-white/60 font-medium">データの読み込みに失敗しました</p>
                  <p className="text-white/30 text-sm mt-1">ページを更新してください</p>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredNotes.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-violet-400" />
                </div>
                <div>
                  <p className="text-white/60 font-medium">
                    {showArchived ? "アーカイブされたノートはありません" : "ノートがありません"}
                  </p>
                  <p className="text-white/30 text-sm mt-1">
                    {showArchived ? "アーカイブにはまだ何もありません" : "新しいノートを作成してみましょう"}
                  </p>
                </div>
                {!showArchived && (
                  <button
                    onClick={handleCreateNote}
                    className="mt-2 px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4 inline-block mr-1" />
                    新規ノート作成
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Notes Grid */}
          {!isLoading && !error && filteredNotes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredNotes.map((note, index) => {
              const color = colorConfig[note.color] || colorConfig.violet;
              const bucket = buckets.find(b => b.id === note.bucket);
              return (
                <article
                  key={note.id}
                  onClick={() => handleOpenNote(note)}
                  draggable
                  onDragStart={() => handleNoteDragStart(note.id)}
                  onDragEnd={() => { setDraggedNote(null); setDragOverBucket(null); }}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={cn(
                    "group relative rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden",
                    "bg-[#18181b] border border-white/[0.06]",
                    "hover:border-white/[0.1] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20",
                    "animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both",
                    draggedNote === note.id && "opacity-50 scale-95",
                    note.archived && "opacity-60"
                  )}
                >
                  {/* Top accent line */}
                  <div className={cn("h-0.5 w-full", color.dot)} />

                  {/* Drag handle */}
                  <div className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-white/20" />
                  </div>

                  <div className="p-4">
                    {/* 2段見出し: カテゴリ + タイトル */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={cn("text-[11px] font-medium uppercase tracking-wide", color.text)}>
                        {bucket?.label || note.bucket}
                      </span>
                      {note.pinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400/30" />}
                      {note.archived && <Archive className="w-3 h-3 text-violet-400" />}
                    </div>
                    <h3 className="font-semibold text-[16px] text-white/90 leading-snug mb-3">{note.title}</h3>

                    <p className="text-[13px] text-white/40 line-clamp-2 leading-relaxed mb-3">{adfToPlainText(note.adfContent).slice(0, 150)}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {note.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                        {/* メディア数をADFから計算 */}
                        {(() => {
                          const mediaCount = note.adfContent.content.filter(n => n.type === "mediaSingle" || n.type === "mediaGroup").length;
                          return mediaCount > 0 ? (
                            <span className="flex items-center gap-1 text-[10px] text-white/20">
                              <Image className="w-2.5 h-2.5" />
                              {mediaCount}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <span className="text-[10px] text-white/20">{note.updatedAt}</span>
                    </div>
                  </div>
                </article>
              );
            })}

            <button
              onClick={handleCreateNote}
              className="group min-h-[200px] rounded-2xl border-2 border-dashed border-white/[0.04] hover:border-violet-500/30 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:bg-violet-500/[0.02]"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/[0.02] group-hover:bg-violet-500/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-90">
                <Plus className="w-6 h-6 text-white/20 group-hover:text-violet-400 transition-colors duration-300" />
              </div>
              <span className="text-[13px] text-white/25 group-hover:text-violet-400/70 font-medium transition-colors duration-300">New note</span>
            </button>
          </div>
          )}
        </div>

        {/* Version Footer */}
        <footer className="px-5 lg:px-6 py-3 border-t border-white/[0.06] mt-8 bg-black/20">
          <div className="text-[11px] text-white/30 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono bg-white/[0.05] px-1.5 py-0.5 rounded">{versionInfo?.commit || "loading..."}</span>
              <span className="text-white/20">•</span>
              <span>{versionInfo?.deployedAt ? new Date(versionInfo.deployedAt).toLocaleString("ja-JP") : "..."}</span>
            </div>
            <div className="text-white/25 truncate">
              {versionInfo?.message || "Loading..."}
            </div>
          </div>
        </footer>
      </main>

      {/* Search modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" onClick={() => setShowSearch(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div
            className="relative w-full max-w-xl bg-[#111113] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Subtle glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-violet-500/10 blur-3xl pointer-events-none" />

            <div className="relative flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
              <Search className="w-5 h-5 text-violet-400/70" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search notes, tasks..."
                className="flex-1 bg-transparent text-[15px] text-white/90 outline-none placeholder:text-white/25"
                autoFocus
              />
              <kbd className="flex items-center gap-1 text-[10px] text-white/25 bg-white/[0.04] px-2 py-1 rounded-lg font-mono border border-white/[0.04]">ESC</kbd>
            </div>

            {/* Quick actions when empty */}
            {!searchQuery && (
              <div className="px-3 py-3 border-b border-white/[0.04]">
                <p className="text-[10px] text-white/25 uppercase tracking-widest px-2 mb-2 font-medium">Quick actions</p>
                <div className="space-y-0.5">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] rounded-xl transition-colors text-left group">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] text-white/70 group-hover:text-white/90">Create new note</p>
                    </div>
                    <kbd className="text-[10px] text-white/20 bg-white/[0.03] px-1.5 py-0.5 rounded font-mono">N</kbd>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] rounded-xl transition-colors text-left group">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] text-white/70 group-hover:text-white/90">View all tasks</p>
                    </div>
                    <kbd className="text-[10px] text-white/20 bg-white/[0.03] px-1.5 py-0.5 rounded font-mono">T</kbd>
                  </button>
                </div>
              </div>
            )}

            {/* Search results */}
            {searchQuery && (
              <div className="max-h-80 overflow-y-auto">
                {filteredNotes.length > 0 ? (
                  <div className="p-2">
                    <p className="text-[10px] text-white/25 uppercase tracking-widest px-3 py-2 font-medium">Notes</p>
                    {filteredNotes.map((note, index) => (
                      <button
                        key={note.id}
                        onClick={() => { handleOpenNote(note); setShowSearch(false); setSearchQuery(""); }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 hover:bg-white/[0.04] rounded-xl transition-all text-left group",
                          index === 0 && "bg-white/[0.02]"
                        )}
                      >
                        <div className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-[#111113]", colorConfig[note.color]?.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-white/80 group-hover:text-white truncate">{note.title}</p>
                          <p className="text-[11px] text-white/30 truncate mt-0.5">{adfToPlainText(note.adfContent).substring(0, 60)}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/30 transition-colors" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.02] flex items-center justify-center mx-auto mb-3">
                      <Search className="w-5 h-5 text-white/20" />
                    </div>
                    <p className="text-[13px] text-white/30">No results for &quot;{searchQuery}&quot;</p>
                    <p className="text-[11px] text-white/20 mt-1">Try different keywords</p>
                  </div>
                )}
              </div>
            )}

            {/* Footer hint */}
            <div className="px-4 py-3 border-t border-white/[0.04] bg-white/[0.01]">
              <div className="flex items-center justify-between text-[10px] text-white/20">
                <span>Type to search</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><kbd className="bg-white/[0.04] px-1 rounded">↑↓</kbd> navigate</span>
                  <span className="flex items-center gap-1"><kbd className="bg-white/[0.04] px-1 rounded">↵</kbd> open</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#09090b]/95 backdrop-blur-2xl border-t border-white/[0.04] px-4 py-2 lg:hidden z-20 safe-area-pb">
        <div className="flex justify-around max-w-md mx-auto">
          <button
            onClick={() => { setSelectedNote(null); setShowArchived(false); }}
            className={cn(
              "flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all duration-200",
              !selectedNote && !showArchived ? "text-white bg-white/[0.06]" : "text-white/35 hover:text-white/60"
            )}
          >
            <Hash className="w-5 h-5" />
            <span className="text-[10px] font-medium">Notes</span>
          </button>
          <button
            onClick={() => { setSelectedNote(null); setShowArchived(true); }}
            className={cn(
              "flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all duration-200",
              showArchived ? "text-white bg-white/[0.06]" : "text-white/35 hover:text-white/60"
            )}
          >
            <Archive className="w-5 h-5" />
            <span className="text-[10px] font-medium">Archive</span>
          </button>
          <button
            onClick={handleCreateNote}
            className="flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all duration-200 bg-gradient-to-t from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/30"
          >
            <Plus className="w-5 h-5 drop-shadow-sm" />
            <span className="text-[10px] font-semibold">New</span>
          </button>
        </div>
      </nav>

      {/* Task Detail Panel */}
      {selectedTask && (() => {
        const relatedNote = notes.find(n => n.id === selectedTask.noteId);
        const noteColor = relatedNote ? colorConfig[relatedNote.color] : colorConfig.violet;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
              className="relative w-full max-w-md bg-[#141417] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Header with color accent */}
              <div className={cn("h-1 w-full", noteColor?.dot || "bg-violet-400")} />

              <div className="p-5">
                {/* Task Title */}
                <div className="flex items-start gap-3 mb-4">
                  <button
                    onClick={() => { handleToggleTask(selectedTask.id); setSelectedTask(null); }}
                    className={cn(
                      "mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0",
                      selectedTask.completed
                        ? "bg-violet-500 border-violet-500"
                        : "border-white/20 hover:border-violet-400"
                    )}
                  >
                    {selectedTask.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </button>
                  <h3 className={cn(
                    "text-[18px] font-semibold leading-snug",
                    selectedTask.completed ? "text-white/40 line-through" : "text-white/90"
                  )}>{selectedTask.title}</h3>
                </div>

                {/* Task Memo */}
                <div className="mb-4">
                  <p className="text-[11px] text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    タスクメモ
                  </p>
                  <textarea
                    defaultValue={selectedTask.memo || ""}
                    placeholder="このタスクについてのメモ..."
                    className="w-full p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-[13px] text-white/70 placeholder:text-white/20 resize-none h-20 focus:outline-none focus:border-violet-500/30 transition-colors"
                  />
                </div>

                {/* Properties */}
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded-lg">
                    <span className="text-[13px] text-white/40 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      期限
                    </span>
                    <button className={cn(
                      "text-[13px] px-2 py-1 rounded-lg transition-all",
                      selectedTask.dueDate === "今日"
                        ? "text-rose-400 bg-rose-500/10"
                        : selectedTask.dueDate
                          ? "text-white/70 bg-white/[0.06]"
                          : "text-white/30 hover:bg-white/[0.04]"
                    )}>
                      {selectedTask.dueDate || "設定する"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded-lg">
                    <span className="text-[13px] text-white/40 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      優先度
                    </span>
                    <button className="text-[13px] text-white/30 px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-all">
                      設定する
                    </button>
                  </div>
                </div>

                {/* Related Note */}
                {relatedNote && (
                  <div className="mb-5">
                    <p className="text-[11px] text-white/30 uppercase tracking-widest mb-2">元のメモ</p>
                    <button
                      onClick={() => { setSelectedTask(null); handleOpenNote(relatedNote); }}
                      className={cn(
                        "w-full p-3 rounded-xl border text-left transition-all hover:bg-white/[0.02]",
                        noteColor?.border || "border-white/[0.06]"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn("w-2 h-2 rounded-full", noteColor?.dot)} />
                        <span className={cn("text-[11px] uppercase tracking-wide", noteColor?.text)}>{relatedNote.bucket}</span>
                      </div>
                      <p className="text-[14px] text-white/80 font-medium mb-1">{relatedNote.title}</p>
                      <p className="text-[12px] text-white/40 line-clamp-2">{adfToPlainText(relatedNote.adfContent).slice(0, 100)}</p>
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { handleToggleTask(selectedTask.id); setSelectedTask(null); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-400 text-white text-[13px] font-medium rounded-xl transition-all"
                  >
                    <Check className="w-4 h-4" />
                    {selectedTask.completed ? "未完了に戻す" : "完了にする"}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("このタスクを削除しますか？")) {
                        setTasks(prev => prev.filter(t => t.id !== selectedTask.id && t.parentId !== selectedTask.id));
                        setSelectedTask(null);
                        toast.success("タスクを削除しました");
                      }
                    }}
                    className="p-2.5 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Close hint */}
              <div className="px-5 py-2 border-t border-white/[0.04] bg-white/[0.01]">
                <p className="text-[10px] text-white/20 text-center">ESC または外側クリックで閉じる</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-2xl max-h-[85vh] bg-[#111113] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-violet-400" />
                <h2 className="text-[17px] font-semibold text-white/90">設定</h2>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-white/30 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.06]">
              {[
                { id: "account" as const, label: "Account", icon: User },
                { id: "apikeys" as const, label: "API Keys", icon: Key },
                { id: "mcp" as const, label: "MCP連携", icon: Sparkles },
                { id: "preferences" as const, label: "Preferences", icon: Settings },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-[13px] font-medium transition-all border-b-2 -mb-px",
                    settingsTab === tab.id
                      ? "text-violet-400 border-violet-400"
                      : "text-white/40 border-transparent hover:text-white/60"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-130px)]">
              {/* Account Tab */}
              {settingsTab === "account" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[15px] font-semibold text-white/90 mb-4">アカウント情報</h3>
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-[14px] text-white/80 font-medium">{userEmail || "読み込み中..."}</p>
                          <p className="text-[12px] text-white/40">ログイン中</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[15px] font-semibold text-white/90 mb-4">セッション</h3>
                    <button
                      onClick={async () => {
                        const supabase = createClient();
                        await supabase.auth.signOut();
                        window.location.href = "/auth/login";
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 text-rose-400 hover:bg-rose-500/10 rounded-xl text-[13px] font-medium transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      ログアウト
                    </button>
                  </div>
                </div>
              )}

              {/* API Keys Tab */}
              {settingsTab === "apikeys" && (
                <SettingsApiKeys />
              )}

              {/* MCP Tab */}
              {settingsTab === "mcp" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[15px] font-semibold text-white/90 mb-2">MCP (Model Context Protocol)</h3>
                    <p className="text-[13px] text-white/40 mb-4">
                      ClaudeやChatGPTからこのアプリにアクセスして、メモやタスクを操作できます。
                    </p>
                  </div>

                  <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                    <h4 className="text-[14px] font-medium text-violet-400 mb-3">Claude Desktop 設定</h4>
                    <p className="text-[12px] text-white/50 mb-3">
                      Claude Desktopの設定ファイルに以下を追加してください:
                    </p>
                    <pre className="p-4 bg-black/40 rounded-lg text-[11px] text-white/70 overflow-x-auto font-mono">
{`{
  "mcpServers": {
    "capture-and-think": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic/mcp-remote-server",
        "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/mcp"
      ],
      "env": {
        "API_KEY": "ct_your-api-key-here"
      }
    }
  }
}`}
                    </pre>
                  </div>

                  <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                    <h4 className="text-[14px] font-medium text-white/80 mb-3">利用可能なMCPツール</h4>
                    <ul className="space-y-2 text-[13px] text-white/50">
                      <li className="flex items-start gap-2">
                        <span className="text-violet-400">•</span>
                        <span><strong className="text-white/70">list_items</strong> - メモ一覧を取得</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-violet-400">•</span>
                        <span><strong className="text-white/70">create_item</strong> - 新しいメモを作成</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-violet-400">•</span>
                        <span><strong className="text-white/70">update_item</strong> - メモを更新</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-violet-400">•</span>
                        <span><strong className="text-white/70">search_items</strong> - メモを検索</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {settingsTab === "preferences" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[15px] font-semibold text-white/90 mb-4">外観</h3>
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Palette className="w-5 h-5 text-white/40" />
                          <div>
                            <p className="text-[14px] text-white/80">テーマ</p>
                            <p className="text-[12px] text-white/40">ダークモードが有効</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 text-[12px] text-white/40 bg-white/[0.04] rounded-lg">Dark</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[15px] font-semibold text-white/90 mb-4">通知</h3>
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-white/40" />
                          <div>
                            <p className="text-[14px] text-white/80">プッシュ通知</p>
                            <p className="text-[12px] text-white/40">期限のリマインダー</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 text-[12px] text-white/40 bg-white/[0.04] rounded-lg">未設定</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[15px] font-semibold text-white/90 mb-4">データ</h3>
                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-white/40" />
                          <div>
                            <p className="text-[14px] text-white/80">データエクスポート</p>
                            <p className="text-[12px] text-white/40">すべてのデータをJSON形式でダウンロード</p>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 text-[12px] text-white/60 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-all">
                          エクスポート
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
