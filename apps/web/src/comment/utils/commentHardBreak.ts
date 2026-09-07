import HardBreak from '@tiptap/extension-hard-break';

/**
 * Enter never splits paragraphs here, so liftEmptyBlock's required empty
 * block never occurs naturally inside a blockquote. A blank line (cursor
 * right after a trailing hard break) is treated as "end the quote": drop
 * that break, split a new paragraph, and lift it out.
 */
export const CommentHardBreak = HardBreak.extend({
  addKeyboardShortcuts() {
    const exitBlockquoteOnBlankLine = () => {
      const { $from, empty } = this.editor.state.selection;
      const insideBlockquote = $from.node(-1)?.type.name === 'blockquote';
      const onBlankLine = $from.nodeBefore?.type.name === 'hardBreak' && !$from.nodeAfter;
      if (!empty || !insideBlockquote || !onBlankLine) return false;
      return this.editor
        .chain()
        .deleteRange({ from: $from.pos - 1, to: $from.pos })
        .splitBlock()
        .liftEmptyBlock()
        .run();
    };
    return {
      ...this.parent?.(),
      Enter: () => exitBlockquoteOnBlankLine() || this.editor.commands.setHardBreak(),
    };
  },
});
