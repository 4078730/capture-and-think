// ============================================
// Atlassian Document Format (ADF) Types
// Confluence互換のドキュメント構造
// ============================================

// Mark types (インライン装飾)
export interface ADFMarkStrong {
  type: "strong";
}

export interface ADFMarkEm {
  type: "em";
}

export interface ADFMarkCode {
  type: "code";
}

export interface ADFMarkStrike {
  type: "strike";
}

export interface ADFMarkUnderline {
  type: "underline";
}

export interface ADFMarkLink {
  type: "link";
  attrs: { href: string; title?: string };
}

export interface ADFMarkTextColor {
  type: "textColor";
  attrs: { color: string };
}

export type ADFMark =
  | ADFMarkStrong
  | ADFMarkEm
  | ADFMarkCode
  | ADFMarkStrike
  | ADFMarkUnderline
  | ADFMarkLink
  | ADFMarkTextColor;

// Inline nodes
export interface ADFTextNode {
  type: "text";
  text: string;
  marks?: ADFMark[];
}

export interface ADFHardBreak {
  type: "hardBreak";
}

export interface ADFMention {
  type: "mention";
  attrs: { id: string; text: string };
}

export interface ADFEmoji {
  type: "emoji";
  attrs: { shortName: string; text?: string };
}

export interface ADFInlineCard {
  type: "inlineCard";
  attrs: { url: string };
}

export type ADFInlineNode =
  | ADFTextNode
  | ADFHardBreak
  | ADFMention
  | ADFEmoji
  | ADFInlineCard;

// Block nodes
export interface ADFParagraph {
  type: "paragraph";
  content?: ADFInlineNode[];
}

export interface ADFHeading {
  type: "heading";
  attrs: { level: 1 | 2 | 3 | 4 | 5 | 6 };
  content?: ADFInlineNode[];
}

export interface ADFCodeBlock {
  type: "codeBlock";
  attrs?: { language?: string };
  content?: ADFTextNode[];
}

export interface ADFBlockquote {
  type: "blockquote";
  content: ADFBlockNode[];
}

export interface ADFBulletList {
  type: "bulletList";
  content: ADFListItem[];
}

export interface ADFOrderedList {
  type: "orderedList";
  attrs?: { order?: number };
  content: ADFListItem[];
}

export interface ADFListItem {
  type: "listItem";
  content: ADFBlockNode[];
}

export interface ADFTaskList {
  type: "taskList";
  attrs: { localId: string };
  content: ADFTaskItem[];
}

export interface ADFTaskItem {
  type: "taskItem";
  attrs: { localId: string; state: "TODO" | "DONE" };
  content?: ADFInlineNode[];
}

export interface ADFRule {
  type: "rule"; // 水平線
}

export interface ADFPanel {
  type: "panel";
  attrs: { panelType: "info" | "note" | "warning" | "error" | "success" };
  content: ADFBlockNode[];
}

export interface ADFExpand {
  type: "expand";
  attrs?: { title?: string };
  content: ADFBlockNode[];
}

// Media nodes
export interface ADFMedia {
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

export interface ADFMediaSingle {
  type: "mediaSingle";
  attrs?: {
    layout?: "center" | "wide" | "full-width" | "wrap-left" | "wrap-right";
  };
  content: [ADFMedia];
}

export interface ADFMediaGroup {
  type: "mediaGroup";
  content: ADFMedia[];
}

// Table nodes
export interface ADFTable {
  type: "table";
  attrs?: {
    isNumberColumnEnabled?: boolean;
    layout?: "default" | "wide" | "full-width";
  };
  content: ADFTableRow[];
}

export interface ADFTableRow {
  type: "tableRow";
  content: (ADFTableHeader | ADFTableCell)[];
}

export interface ADFTableHeader {
  type: "tableHeader";
  attrs?: {
    colspan?: number;
    rowspan?: number;
    colwidth?: number[];
    background?: string;
  };
  content: ADFBlockNode[];
}

export interface ADFTableCell {
  type: "tableCell";
  attrs?: {
    colspan?: number;
    rowspan?: number;
    colwidth?: number[];
    background?: string;
  };
  content: ADFBlockNode[];
}

// Block node union type
export type ADFBlockNode =
  | ADFParagraph
  | ADFHeading
  | ADFCodeBlock
  | ADFBlockquote
  | ADFBulletList
  | ADFOrderedList
  | ADFTaskList
  | ADFRule
  | ADFPanel
  | ADFExpand
  | ADFMediaSingle
  | ADFMediaGroup
  | ADFTable;

// Document root
export interface ADFDocument {
  version: 1;
  type: "doc";
  content: ADFBlockNode[];
}
