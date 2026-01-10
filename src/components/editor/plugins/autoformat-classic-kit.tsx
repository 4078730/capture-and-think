'use client';

import type { AutoformatBlockRule, AutoformatRule } from '@platejs/autoformat';
import type { SlateEditor } from 'platejs';

import { AutoformatPlugin } from '@platejs/autoformat';
import { toggleList, unwrapList } from '@platejs/list-classic';
import { ElementApi, isType, KEYS } from 'platejs';

const preFormat: AutoformatBlockRule['preFormat'] = (editor) =>
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

const autoformatMarks: AutoformatRule[] = [
  {
    match: '**',
    mode: 'mark',
    type: KEYS.bold,
  },
  {
    match: '__',
    mode: 'mark',
    type: KEYS.underline,
  },
  {
    match: '*',
    mode: 'mark',
    type: KEYS.italic,
  },
  {
    match: '_',
    mode: 'mark',
    type: KEYS.italic,
  },
  {
    match: '~~',
    mode: 'mark',
    type: KEYS.strikethrough,
  },
  {
    match: '`',
    mode: 'mark',
    type: KEYS.code,
  },
];

const autoformatBlocks: AutoformatRule[] = [
  {
    match: '# ',
    mode: 'block',
    preFormat,
    type: KEYS.h1,
  },
  {
    match: '## ',
    mode: 'block',
    preFormat,
    type: KEYS.h2,
  },
  {
    match: '### ',
    mode: 'block',
    preFormat,
    type: KEYS.h3,
  },
  {
    match: '#### ',
    mode: 'block',
    preFormat,
    type: KEYS.h4,
  },
  {
    match: '##### ',
    mode: 'block',
    preFormat,
    type: KEYS.h5,
  },
  {
    match: '###### ',
    mode: 'block',
    preFormat,
    type: KEYS.h6,
  },
  {
    match: '> ',
    mode: 'block',
    preFormat,
    type: KEYS.blockquote,
  },
];

const autoformatLists: AutoformatRule[] = [
  {
    match: ['* ', '- '],
    mode: 'block',
    preFormat,
    type: KEYS.li,
    format: (editor) => formatList(editor, KEYS.ulClassic),
  },
  {
    match: [String.raw`^\d+\.$ `, String.raw`^\d+\)$ `],
    matchByRegex: true,
    mode: 'block',
    preFormat,
    type: KEYS.li,
    format: (editor) => formatList(editor, KEYS.olClassic),
  },
];

export const AutoformatClassicKit = [
  AutoformatPlugin.configure({
    options: {
      enableUndoOnDelete: true,
      rules: [
        ...autoformatBlocks,
        ...autoformatMarks,
        ...autoformatLists,
      ],
    },
  }),
];
