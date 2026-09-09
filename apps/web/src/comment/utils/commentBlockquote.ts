import { InputRule } from '@tiptap/core';
import Blockquote from '@tiptap/extension-blockquote';

const BLOCKQUOTE_INPUT_REGEX = /^\s*>\s$/;

/**
 * Typing "> " while already inside a blockquote nests another blockquote by
 * default (Tiptap's own wrappingInputRule has no "already wrapped" guard).
 * A bare comment editor gives no visual feedback that the first "> " worked,
 * so users retype it -- skip the wrap in that case and leave the text as-is.
 */
export const CommentBlockquote = Blockquote.extend({
  addInputRules() {
    return [
      new InputRule({
        find: BLOCKQUOTE_INPUT_REGEX,
        handler: ({ state, range, chain }) => {
          const insideBlockquote = state.selection.$from.node(-1)?.type.name === this.name;
          if (insideBlockquote) return;
          chain().deleteRange(range).wrapIn(this.name).run();
        },
      }),
    ];
  },
});
