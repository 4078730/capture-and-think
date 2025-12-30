import type {
  ADFInlineNode,
  ADFBlockNode,
  ADFDocument,
  ADFTaskItem,
  ADFListItem,
} from "./types";
import { adfText, adfHeading, adfCodeBlock } from "./helpers";

// ============================================
// ADF → プレーンテキスト変換
// ============================================

/**
 * インラインノードをプレーンテキストに変換
 */
export function adfInlineToPlainText(
  nodes: ADFInlineNode[] | undefined
): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text": {
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
        }
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
    })
    .join("");
}

/**
 * ブロックノードをプレーンテキストに変換
 */
export function adfBlockToPlainText(node: ADFBlockNode): string {
  switch (node.type) {
    case "paragraph":
      return adfInlineToPlainText(node.content);
    case "heading": {
      const prefix = "#".repeat(node.attrs.level);
      return `${prefix} ${adfInlineToPlainText(node.content)}`;
    }
    case "codeBlock": {
      const lang = node.attrs?.language || "";
      const code = node.content?.map((t) => t.text).join("") || "";
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }
    case "blockquote":
      return node.content.map((b) => `> ${adfBlockToPlainText(b)}`).join("\n");
    case "bulletList":
      return node.content
        .map((item) => {
          const itemContent = item.content.map(adfBlockToPlainText).join("\n");
          return `- ${itemContent}`;
        })
        .join("\n");
    case "orderedList":
      return node.content
        .map((item, i) => {
          const itemContent = item.content.map(adfBlockToPlainText).join("\n");
          return `${(node.attrs?.order || 1) + i}. ${itemContent}`;
        })
        .join("\n");
    case "taskList":
      return node.content
        .map((task) => {
          const checkbox = task.attrs.state === "DONE" ? "[x]" : "[ ]";
          return `${checkbox} ${adfInlineToPlainText(task.content)}`;
        })
        .join("\n");
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
      return node.content
        .map((m) => {
          const alt = m.attrs.alt || "画像";
          const url = m.attrs.url || "";
          return `![${alt}](${url})`;
        })
        .join("\n");
    case "table":
      return node.content
        .map((row) =>
          row.content
            .map((cell) => cell.content.map(adfBlockToPlainText).join(" "))
            .join(" | ")
        )
        .join("\n");
    default:
      return "";
  }
}

/**
 * ADFドキュメントをプレーンテキストに変換
 */
export function adfToPlainText(doc: ADFDocument): string {
  return doc.content.map(adfBlockToPlainText).join("\n\n");
}

// ============================================
// プレーンテキスト → ADF変換
// ============================================

/**
 * インラインコンテンツをパース
 */
export function parseInlineContent(text: string): ADFInlineNode[] {
  const nodes: ADFInlineNode[] = [];
  // Markdown記法: **bold**, _italic_, `code`, [[note]], [text](url), https://...
  const regex =
    /(\*\*([^*]+)\*\*|_([^_]+)_|`([^`]+)`|\[\[([^\]]+)\]\]|(?<!!)\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s)]+))/g;
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
      nodes.push(
        adfText(match[5], [{ type: "link", attrs: { href: `note://${match[5]}` } }])
      );
    } else if (match[6] && match[7]) {
      // [text](url) - Markdown link
      nodes.push(
        adfText(match[6], [{ type: "link", attrs: { href: match[7] } }])
      );
    } else if (match[8]) {
      // URL (plain)
      nodes.push(
        adfText(match[8], [{ type: "link", attrs: { href: match[8] } }])
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // 残りのテキスト
  if (lastIndex < text.length) {
    nodes.push(adfText(text.slice(lastIndex)));
  }

  return nodes.length > 0 ? nodes : [adfText(text)];
}

/**
 * プレーンテキストをADFドキュメントに変換
 */
export function plainTextToADF(text: string): ADFDocument {
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
              state: taskMatch[1] === "x" ? "DONE" : "TODO",
            },
            content: parseInlineContent(taskMatch[2]),
          });
        }
        i++;
      }
      content.push({
        type: "taskList",
        attrs: { localId: `tasklist-${Date.now()}` },
        content: taskItems,
      });
      continue;
    }

    // 箇条書き - or •
    if (line.match(/^[-•]\s/)) {
      const listItems: ADFListItem[] = [];
      while (i < lines.length && lines[i].match(/^[-•]\s/)) {
        const itemText = lines[i].replace(/^[-•]\s/, "");
        listItems.push({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInlineContent(itemText) }],
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
        content: [
          {
            type: "media",
            attrs: {
              id: `media-${Date.now()}`,
              type: "external",
              url: imageMatch[2].trim(),
              alt: imageMatch[1].trim() || "画像",
            },
          },
        ],
      });
      i++;
      continue;
    }

    // パネル [INFO], [WARNING], etc.
    const panelMatch = line.match(/^\[(INFO|NOTE|WARNING|ERROR|SUCCESS)\]$/i);
    if (panelMatch) {
      const panelType = panelMatch[1].toLowerCase() as
        | "info"
        | "note"
        | "warning"
        | "error"
        | "success";
      const panelContent: ADFBlockNode[] = [];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !lines[i].match(/^\[/)
      ) {
        panelContent.push({
          type: "paragraph",
          content: parseInlineContent(lines[i]),
        });
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
