"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ADFDocument,
  ADFBlockNode,
  ADFInlineNode,
} from "@/lib/adf";

// ============================================
// Props
// ============================================

export interface ADFRendererProps {
  document: ADFDocument;
  onNoteLinkClick?: (noteTitle: string) => void;
  onImageClick?: (url: string) => void;
  className?: string;
}

interface ADFInlineRendererProps {
  nodes?: ADFInlineNode[];
  onNoteLinkClick?: (noteTitle: string) => void;
}

interface ADFBlockRendererProps {
  node: ADFBlockNode;
  onNoteLinkClick?: (noteTitle: string) => void;
  onImageClick?: (url: string) => void;
}

// ============================================
// Inline Renderer
// ============================================

function ADFInlineRenderer({ nodes, onNoteLinkClick }: ADFInlineRendererProps) {
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
                    element = (
                      <strong key={`strong-${i}`} className="font-bold text-white/80">
                        {element}
                      </strong>
                    );
                    break;
                  case "em":
                    element = (
                      <em key={`em-${i}`} className="italic">
                        {element}
                      </em>
                    );
                    break;
                  case "code":
                    element = (
                      <code
                        key={`code-${i}`}
                        className="px-1.5 py-0.5 bg-white/[0.08] rounded text-[14px] text-violet-300 font-mono"
                      >
                        {element}
                      </code>
                    );
                    break;
                  case "strike":
                    element = (
                      <s key={`strike-${i}`} className="line-through text-white/40">
                        {element}
                      </s>
                    );
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
                          onClick={(e) => e.stopPropagation()}
                        >
                          {element}
                        </a>
                      );
                    }
                    break;
                  }
                  case "textColor":
                    element = (
                      <span key={`color-${i}`} style={{ color: mark.attrs.color }}>
                        {element}
                      </span>
                    );
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
              <span
                key={i}
                className="px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded"
              >
                @{node.attrs.text}
              </span>
            );
          case "emoji":
            return (
              <span key={i}>
                {node.attrs.text || `:${node.attrs.shortName}:`}
              </span>
            );
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

// ============================================
// Block Renderer
// ============================================

function ADFBlockRenderer({
  node,
  onNoteLinkClick,
  onImageClick,
}: ADFBlockRendererProps) {
  switch (node.type) {
    case "paragraph":
      return (
        <p className="text-[16px] text-white/55 leading-[1.9]">
          <ADFInlineRenderer
            nodes={node.content}
            onNoteLinkClick={onNoteLinkClick}
          />
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
      const content = (
        <ADFInlineRenderer
          nodes={node.content}
          onNoteLinkClick={onNoteLinkClick}
        />
      );

      switch (level) {
        case 1:
          return <h1 className={className}>{content}</h1>;
        case 2:
          return <h2 className={className}>{content}</h2>;
        case 3:
          return <h3 className={className}>{content}</h3>;
        case 4:
          return <h4 className={className}>{content}</h4>;
        case 5:
          return <h5 className={className}>{content}</h5>;
        case 6:
          return <h6 className={className}>{content}</h6>;
        default:
          return <h3 className={className}>{content}</h3>;
      }
    }

    case "codeBlock":
      return (
        <pre className="p-4 bg-white/[0.04] rounded-lg border border-white/[0.06] overflow-x-auto">
          <code className="text-[14px] text-violet-300 font-mono leading-relaxed">
            {node.content?.map((t) => t.text).join("") || ""}
          </code>
        </pre>
      );

    case "blockquote":
      return (
        <blockquote className="pl-4 border-l-2 border-white/20 text-white/50 italic">
          {node.content.map((block, i) => (
            <ADFBlockRenderer
              key={i}
              node={block}
              onNoteLinkClick={onNoteLinkClick}
              onImageClick={onImageClick}
            />
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
                  <ADFBlockRenderer
                    key={j}
                    node={block}
                    onNoteLinkClick={onNoteLinkClick}
                    onImageClick={onImageClick}
                  />
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
              <span className="text-white/30 font-mono text-[14px] mt-0.5">
                {(node.attrs?.order || 1) + i}.
              </span>
              <div className="flex-1">
                {item.content.map((block, j) => (
                  <ADFBlockRenderer
                    key={j}
                    node={block}
                    onNoteLinkClick={onNoteLinkClick}
                    onImageClick={onImageClick}
                  />
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
              <span
                className={cn(
                  "text-[16px] leading-[1.9]",
                  task.attrs.state === "DONE"
                    ? "text-white/30 line-through"
                    : "text-white/55"
                )}
              >
                <ADFInlineRenderer
                  nodes={task.content}
                  onNoteLinkClick={onNoteLinkClick}
                />
              </span>
            </div>
          ))}
        </div>
      );

    case "rule":
      return <hr className="border-white/10 my-4" />;

    case "panel": {
      const panelStyles: Record<
        string,
        { bg: string; border: string; icon: string }
      > = {
        info: {
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          icon: "text-blue-400",
        },
        note: {
          bg: "bg-gray-500/10",
          border: "border-gray-500/20",
          icon: "text-gray-400",
        },
        warning: {
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          icon: "text-amber-400",
        },
        error: {
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          icon: "text-red-400",
        },
        success: {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          icon: "text-emerald-400",
        },
      };
      const style = panelStyles[node.attrs.panelType] || panelStyles.info;
      return (
        <div className={`p-4 rounded-lg border ${style.bg} ${style.border}`}>
          {node.content.map((block, i) => (
            <ADFBlockRenderer
              key={i}
              node={block}
              onNoteLinkClick={onNoteLinkClick}
              onImageClick={onImageClick}
            />
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
              <ADFBlockRenderer
                key={i}
                node={block}
                onNoteLinkClick={onNoteLinkClick}
                onImageClick={onImageClick}
              />
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
            <p className="text-[11px] text-white/30 mt-2 text-center">
              {media.attrs.alt}
            </p>
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
                          cell.type === "tableHeader" &&
                            "bg-white/[0.04] font-medium"
                        )}
                        colSpan={cell.attrs?.colspan}
                        rowSpan={cell.attrs?.rowspan}
                        style={
                          cell.attrs?.background
                            ? { backgroundColor: cell.attrs.background }
                            : undefined
                        }
                      >
                        {cell.content.map((block, blockIdx) => (
                          <ADFBlockRenderer
                            key={blockIdx}
                            node={block}
                            onNoteLinkClick={onNoteLinkClick}
                            onImageClick={onImageClick}
                          />
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

// ============================================
// Main Renderer
// ============================================

export function ADFRenderer({
  document,
  onNoteLinkClick,
  onImageClick,
  className,
}: ADFRendererProps) {
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

export default ADFRenderer;
