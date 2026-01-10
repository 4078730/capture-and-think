"use client";

import { useCallback, useMemo } from "react";
import type { Value, SlateEditor } from "platejs";
import type { AutoformatBlockRule, AutoformatRule } from "@platejs/autoformat";
import { Plate, usePlateEditor } from "platejs/react";
import { KEYS, ElementApi, isType } from "platejs";
import {
  ListPlugin,
  BulletedListPlugin,
  NumberedListPlugin,
  ListItemPlugin,
  ListItemContentPlugin,
  TodoListPlugin,
} from "@platejs/list-classic/react";
import { toggleList, unwrapList, toggleTaskList } from "@platejs/list-classic";
import { AutoformatPlugin } from "@platejs/autoformat";
import { TogglePlugin, openNextToggles } from "@platejs/toggle/react";
import { IndentPlugin } from "@platejs/indent/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";

import { BasicNodesKit } from "@/components/editor/plugins/basic-nodes-kit";
import { Editor, EditorContainer } from "@/components/ui/editor";
import { FixedToolbar } from "@/components/ui/fixed-toolbar";
import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button";
import { ToolbarButton, ToolbarGroup } from "@/components/ui/toolbar";
import {
  BulletedListElement,
  NumberedListElement,
  ListItemElement,
  ListItemContentElement,
} from "@/components/ui/list-node";
import { ToggleElement } from "@/components/ui/toggle-node";
import { TodoListElement } from "@/components/ui/todo-list-node";
import { cn } from "@/lib/utils";
import type { ADFDocument } from "@/lib/adf";
import { adfToPlainText, plainTextToADF } from "@/lib/adf";

export interface PlateEditorProps {
  value: ADFDocument | null;
  onChange: (doc: ADFDocument, plainText: string) => void;
  onTextSelect?: (text: string, range: Range) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onImageClick?: (url: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

const preFormat: AutoformatBlockRule["preFormat"] = (editor) =>
  unwrapList(editor);

const format = (editor: SlateEditor, customFormatting: () => void) => {
  if (editor.selection) {
    const parentEntry = editor.api.parent(editor.selection);
    if (!parentEntry) return;
    const [node] = parentEntry;
    if (ElementApi.isElement(node) && !isType(editor, node, KEYS.codeBlock)) {
      customFormatting();
    }
  }
};

const formatList = (editor: SlateEditor, elementKey: string) => {
  format(editor, () =>
    toggleList(editor, {
      type: editor.getType(elementKey),
    })
  );
};

const autoformatBlocks: AutoformatRule[] = [
  { mode: "block", type: KEYS.h1, match: "# ", preFormat },
  { mode: "block", type: KEYS.h2, match: "## ", preFormat },
  { mode: "block", type: KEYS.h3, match: "### ", preFormat },
  { mode: "block", type: KEYS.blockquote, match: "> ", preFormat },
  {
    mode: "block",
    type: KEYS.toggle,
    match: "+ ",
    preFormat: openNextToggles,
  },
];

const formatTodoList = (editor: SlateEditor, checked: boolean) => {
  format(editor, () => {
    toggleTaskList(editor);
    editor.tf.setNodes({ checked });
  });
};

const autoformatLists: AutoformatRule[] = [
  {
    mode: "block",
    type: KEYS.li,
    match: ["* "],
    preFormat,
    format: (editor) => formatList(editor, KEYS.ulClassic),
  },
  {
    mode: "block",
    type: KEYS.li,
    match: [String.raw`^\d+\.$ `, String.raw`^\d+\)$ `],
    matchByRegex: true,
    preFormat,
    format: (editor) => formatList(editor, KEYS.olClassic),
  },
  {
    mode: "block",
    type: KEYS.taskList,
    match: ["[] ", "- [] ", "- [ ] "],
    preFormat,
    format: (editor) => formatTodoList(editor, false),
  },
  {
    mode: "block",
    type: KEYS.taskList,
    match: ["[x] ", "- [x] ", "- [X] "],
    preFormat,
    format: (editor) => formatTodoList(editor, true),
  },
];

const autoformatMarks: AutoformatRule[] = [
  { mode: "mark", type: KEYS.bold, match: "**" },
  { mode: "mark", type: KEYS.italic, match: "_" },
  { mode: "mark", type: KEYS.code, match: "`" },
  { mode: "mark", type: KEYS.strikethrough, match: "~~" },
];

const autoformatRules: AutoformatRule[] = [
  ...autoformatBlocks,
  ...autoformatLists,
  ...autoformatMarks,
];

function markdownToSlateValue(markdown: string): Value {
  if (!markdown.trim()) {
    return [{ type: "p", children: [{ text: "" }] }];
  }

  const lines = markdown.split("\n");
  const nodes: Value = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = "";

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        nodes.push({
          type: "code_block",
          lang: codeBlockLang,
          children: [{ text: codeBlockLines.join("\n") }],
        });
        codeBlockLines = [];
        codeBlockLang = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (line.startsWith("# ")) {
      nodes.push({ type: "h1", children: parseInlineMarks(line.slice(2)) });
    } else if (line.startsWith("## ")) {
      nodes.push({ type: "h2", children: parseInlineMarks(line.slice(3)) });
    } else if (line.startsWith("### ")) {
      nodes.push({ type: "h3", children: parseInlineMarks(line.slice(4)) });
    } else if (line.startsWith("> ")) {
      nodes.push({ type: "blockquote", children: [{ type: "p", children: parseInlineMarks(line.slice(2)) }] });
    } else if (line.match(/^[-*+]\s*\[[ xX]\]\s/)) {
      const checkMatch = line.match(/^[-*+]\s*\[([ xX])\]\s(.*)$/);
      if (checkMatch) {
        const checked = checkMatch[1].toLowerCase() === "x";
        const text = checkMatch[2];
        const taskItem = { type: "taskList", checked, children: [{ type: "lic", children: parseInlineMarks(text) }] };
        nodes.push(taskItem);
      }
    } else if (line.match(/^[-*+]\s/)) {
      const lastNode = nodes[nodes.length - 1];
      const listItem = { type: "li", children: [{ type: "lic", children: parseInlineMarks(line.slice(2)) }] };
      if (lastNode && (lastNode as Record<string, unknown>).type === "ul") {
        ((lastNode as Record<string, unknown>).children as Value).push(listItem);
      } else {
        nodes.push({ type: "ul", children: [listItem] });
      }
    } else if (line.match(/^\d+[.)]\s/)) {
      const lastNode = nodes[nodes.length - 1];
      const content = line.replace(/^\d+[.)]\s/, "");
      const listItem = { type: "li", children: [{ type: "lic", children: parseInlineMarks(content) }] };
      if (lastNode && (lastNode as Record<string, unknown>).type === "ol") {
        ((lastNode as Record<string, unknown>).children as Value).push(listItem);
      } else {
        nodes.push({ type: "ol", children: [listItem] });
      }
    } else if (line.trim() === "") {
      continue;
    } else {
      nodes.push({ type: "p", children: parseInlineMarks(line) });
    }
  }

  if (inCodeBlock && codeBlockLines.length > 0) {
    nodes.push({
      type: "code_block",
      lang: codeBlockLang,
      children: [{ text: codeBlockLines.join("\n") }],
    });
  }

  return nodes.length > 0 ? nodes : [{ type: "p", children: [{ text: "" }] }];
}

function parseInlineMarks(text: string): Array<{ text: string; bold?: boolean; italic?: boolean; code?: boolean; strikethrough?: boolean }> {
  const result: Array<{ text: string; bold?: boolean; italic?: boolean; code?: boolean; strikethrough?: boolean }> = [];

  let remaining = text;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/^_(.+?)_/) || remaining.match(/^\*([^*]+?)\*/);
    const codeMatch = remaining.match(/^`([^`]+)`/);
    const strikeMatch = remaining.match(/^~~(.+?)~~/);

    if (boldMatch) {
      result.push({ text: boldMatch[1], bold: true });
      remaining = remaining.slice(boldMatch[0].length);
    } else if (strikeMatch) {
      result.push({ text: strikeMatch[1], strikethrough: true });
      remaining = remaining.slice(strikeMatch[0].length);
    } else if (codeMatch) {
      result.push({ text: codeMatch[1], code: true });
      remaining = remaining.slice(codeMatch[0].length);
    } else if (italicMatch) {
      result.push({ text: italicMatch[1], italic: true });
      remaining = remaining.slice(italicMatch[0].length);
    } else {
      const nextSpecial = remaining.search(/\*\*|__|~~|`|\*|_/);
      if (nextSpecial === -1) {
        result.push({ text: remaining });
        break;
      } else if (nextSpecial === 0) {
        result.push({ text: remaining[0] });
        remaining = remaining.slice(1);
      } else {
        result.push({ text: remaining.slice(0, nextSpecial) });
        remaining = remaining.slice(nextSpecial);
      }
    }
  }

  return result.length > 0 ? result : [{ text: "" }];
}

function slateValueToMarkdown(value: Value): string {
  const lines: string[] = [];

  for (const node of value) {
    const nodeAny = node as Record<string, unknown>;
    const type = nodeAny.type as string;
    const children = nodeAny.children as Array<Record<string, unknown>>;

    switch (type) {
      case "h1":
        lines.push(`# ${serializeChildren(children)}`);
        break;
      case "h2":
        lines.push(`## ${serializeChildren(children)}`);
        break;
      case "h3":
        lines.push(`### ${serializeChildren(children)}`);
        break;
      case "blockquote":
        lines.push(`> ${serializeChildren(children)}`);
        break;
      case "ul":
        if (children) {
          children.forEach((li) => {
            lines.push(`- ${serializeChildren(li.children as Array<Record<string, unknown>>)}`);
          });
        }
        break;
      case "ol":
        if (children) {
          children.forEach((li, idx) => {
            lines.push(`${idx + 1}. ${serializeChildren(li.children as Array<Record<string, unknown>>)}`);
          });
        }
        break;
      case "taskList":
        const checked = nodeAny.checked as boolean;
        lines.push(`- [${checked ? "x" : " "}] ${serializeChildren(children)}`);
        break;
      case "code_block":
        const lang = (nodeAny.lang as string) || "";
        lines.push(`\`\`\`${lang}`);
        lines.push(serializeChildren(children));
        lines.push("```");
        break;
      default:
        lines.push(serializeChildren(children));
    }
  }

  return lines.join("\n");
}

function serializeChildren(children: Array<Record<string, unknown>> | undefined): string {
  if (!children || !Array.isArray(children)) return "";
  return children
    .map((child) => {
      if (child.text !== undefined) {
        let text = (child.text as string) || "";
        if (child.bold) text = `**${text}**`;
        if (child.italic) text = `_${text}_`;
        if (child.strikethrough) text = `~~${text}~~`;
        if (child.code) text = `\`${text}\``;
        return text;
      }
      if (child.type === "lic" && child.children) {
        return serializeChildren(child.children as Array<Record<string, unknown>>);
      }
      if (child.type === "p" && child.children) {
        return serializeChildren(child.children as Array<Record<string, unknown>>);
      }
      if (child.children) {
        return serializeChildren(child.children as Array<Record<string, unknown>>);
      }
      return "";
    })
    .join("");
}

export function PlateEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
  readOnly = false,
}: PlateEditorProps) {
  const initialMarkdown = value ? adfToPlainText(value) : "";
  const initialValue = useMemo(() => markdownToSlateValue(initialMarkdown), [initialMarkdown]);

  const editor = usePlateEditor({
    plugins: [
      ...BasicNodesKit,
      ListPlugin,
      BulletedListPlugin.configure({
        node: { component: BulletedListElement },
      }),
      NumberedListPlugin.configure({
        node: { component: NumberedListElement },
      }),
      ListItemPlugin.configure({
        node: { component: ListItemElement },
      }),
      ListItemContentPlugin.configure({
        node: { component: ListItemContentElement },
      }),
      TodoListPlugin.configure({
        node: { component: TodoListElement },
      }),
      IndentPlugin,
      TogglePlugin.configure({
        node: { component: ToggleElement },
      }),
      AutoformatPlugin.configure({
        options: {
          rules: autoformatRules,
          enableUndoOnDelete: true,
        },
      }),
    ],
    value: initialValue,
  });

  const handleChange = useCallback(
    ({ value: newValue }: { value: Value }) => {
      const markdown = slateValueToMarkdown(newValue);
      const adfDoc = plainTextToADF(markdown);
      onChange(adfDoc, markdown);
    },
    [onChange]
  );

  return (
    <div className={cn("plate-editor-wrapper rounded-lg border border-white/[0.08] bg-white/[0.02]", className)}>
      <Plate editor={editor} onChange={handleChange}>
        <FixedToolbar className="border-white/[0.08] bg-white/[0.02]">
          <ToolbarGroup>
            <MarkToolbarButton nodeType="bold" tooltip="Bold (⌘+B)">
              <Bold className="size-4" />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType="italic" tooltip="Italic (⌘+I)">
              <Italic className="size-4" />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType="underline" tooltip="Underline (⌘+U)">
              <Underline className="size-4" />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType="strikethrough" tooltip="Strikethrough (⌘+Shift+X)">
              <Strikethrough className="size-4" />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType="code" tooltip="Code (⌘+E)">
              <Code className="size-4" />
            </MarkToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup>
            <ToolbarButton onClick={() => editor.tf.h1.toggle()} tooltip="Heading 1 (⌘+Alt+1)">
              <Heading1 className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.tf.h2.toggle()} tooltip="Heading 2 (⌘+Alt+2)">
              <Heading2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.tf.h3.toggle()} tooltip="Heading 3 (⌘+Alt+3)">
              <Heading3 className="size-4" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup>
            <ToolbarButton onClick={() => editor.tf.toggle.bulletedList()} tooltip="Bullet List">
              <List className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.tf.toggle.numberedList()} tooltip="Numbered List">
              <ListOrdered className="size-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.tf.blockquote.toggle()} tooltip="Quote (⌘+Shift+>)">
              <Quote className="size-4" />
            </ToolbarButton>
          </ToolbarGroup>
        </FixedToolbar>

        <EditorContainer variant="default" className="min-h-[200px]">
          <Editor
            readOnly={readOnly}
            placeholder={placeholder}
            variant="fullWidth"
            className="text-white/80 caret-violet-400"
          />
        </EditorContainer>
      </Plate>
    </div>
  );
}

export default PlateEditor;
