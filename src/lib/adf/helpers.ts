import type {
  ADFMark,
  ADFTextNode,
  ADFInlineNode,
  ADFParagraph,
  ADFHeading,
  ADFCodeBlock,
  ADFListItem,
  ADFTaskItem,
  ADFMediaSingle,
  ADFBlockNode,
  ADFDocument,
} from "./types";

/**
 * テキストノードを作成
 */
export function adfText(text: string, marks?: ADFMark[]): ADFTextNode {
  return marks ? { type: "text", text, marks } : { type: "text", text };
}

/**
 * パラグラフを作成
 */
export function adfParagraph(content: ADFInlineNode[]): ADFParagraph {
  return { type: "paragraph", content };
}

/**
 * 見出しを作成
 */
export function adfHeading(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  content: ADFInlineNode[]
): ADFHeading {
  return { type: "heading", attrs: { level }, content };
}

/**
 * コードブロックを作成
 */
export function adfCodeBlock(code: string, language?: string): ADFCodeBlock {
  return {
    type: "codeBlock",
    attrs: language ? { language } : undefined,
    content: [{ type: "text", text: code }],
  };
}

/**
 * リストアイテムを作成
 */
export function adfListItem(content: ADFBlockNode[]): ADFListItem {
  return { type: "listItem", content };
}

/**
 * タスクアイテムを作成
 */
export function adfTaskItem(text: string, done: boolean): ADFTaskItem {
  return {
    type: "taskItem",
    attrs: {
      localId: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      state: done ? "DONE" : "TODO",
    },
    content: [adfText(text)],
  };
}

/**
 * メディア（画像）を作成
 */
export function adfMedia(url: string, alt?: string): ADFMediaSingle {
  return {
    type: "mediaSingle",
    attrs: { layout: "center" },
    content: [
      {
        type: "media",
        attrs: {
          id: `media-${Date.now()}`,
          type: "external",
          url,
          alt,
        },
      },
    ],
  };
}

/**
 * 空のドキュメントを作成
 */
export function createEmptyADFDocument(): ADFDocument {
  return {
    version: 1,
    type: "doc",
    content: [{ type: "paragraph", content: [] }],
  };
}

/**
 * シンプルなテキストドキュメントを作成
 */
export function createSimpleADFDocument(text: string): ADFDocument {
  return {
    version: 1,
    type: "doc",
    content: [{ type: "paragraph", content: [adfText(text)] }],
  };
}
