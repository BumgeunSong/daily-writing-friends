import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Text from '@tiptap/extension-text';
import { useEditor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';

import type { ProseMirrorDoc } from '@/shared/model/ProseMirror';
import { cn } from '@/shared/utils/cn';
import { useBoardMembers } from '@/user/hooks/useMentionCandidates';

import { CommentBlockquote } from '@/comment/utils/commentBlockquote';
import { CommentHardBreak } from '@/comment/utils/commentHardBreak';
import { createMentionExtension } from '@/comment/utils/mentionExtension';

interface UseCommentEditorOptions {
  boardId: string;
  participantIds?: string[];
  placeholder: string;
  initialContent?: string;
  disabled?: boolean;
  onSubmit: (content: string, contentJson: ProseMirrorDoc) => Promise<void>;
}

/**
 * Owns the comment/reply rich-text editor: extension wiring (blockquote and
 * mention support) plus the submit lifecycle, including draft retention when
 * `onSubmit` rejects.
 */
export function useCommentEditor({
  boardId,
  participantIds,
  placeholder,
  initialContent = '',
  disabled = false,
  onSubmit,
}: UseCommentEditorOptions) {
  const { data: members = [] } = useBoardMembers(boardId);

  // The editor is created once; suggestion callbacks read the latest candidates
  // through refs rather than closing over stale render values.
  const membersRef = useRef(members);
  const participantsRef = useRef(new Set(participantIds ?? []));
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    membersRef.current = members;
  }, [members]);
  useEffect(() => {
    participantsRef.current = new Set(participantIds ?? []);
  }, [participantIds]);

  const editor = useEditor({
    content: initialContent,
    extensions: [
      Document,
      CommentBlockquote,
      Paragraph,
      CommentHardBreak,
      Text,
      Placeholder.configure({ placeholder }),
      createMentionExtension(membersRef, participantsRef),
    ],
    editorProps: {
      attributes: {
        // Make the editor a named textbox explicitly rather than leaning on the
        // browser's contenteditable heuristic; the old textarea took its
        // accessible name from the placeholder, so mirror that here.
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': placeholder,
        class: cn(
          'min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-base',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          // Visible left border on blockquote so applying "> " has feedback
          // in the editor itself, not just after posting.
          '[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
        ),
      },
    },
  });

  // Parent onSubmit owns error UX (toast/log); on failure we keep the draft
  // (skip clearContent) and just re-enable, so a rejection is not re-thrown.
  const handleSubmit = async () => {
    if (!editor || submitting || disabled) return;
    const content = editor.getHTML();
    if (!editor.getText().trim()) return;
    const contentJson = editor.getJSON() as ProseMirrorDoc;
    setSubmitting(true);
    try {
      await onSubmit(content, contentJson);
      editor.commands.clearContent();
    } catch {
      // draft retained
    } finally {
      setSubmitting(false);
    }
  };

  return { editor, submitting, handleSubmit };
}
