import Document from '@tiptap/extension-document';
import Mention from '@tiptap/extension-mention';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Text from '@tiptap/extension-text';
import { EditorContent, ReactRenderer, useEditor } from '@tiptap/react';
import { Loader2, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils/cn';
import type { ProseMirrorDoc } from '@/shared/model/ProseMirror';
import { filterAndRankCandidates, useBoardMembers } from '@/user/hooks/useMentionCandidates';

import { MentionList, type MentionListHandle } from './MentionList';

interface MentionableInputProps {
  boardId: string;
  participantIds?: string[];
  placeholder?: string;
  initialContent?: string;
  disabled?: boolean;
  onSubmit: (content: string, contentJson: ProseMirrorDoc) => Promise<void>;
}

const MENTION_LIMIT = 8;

export function MentionableInput({
  boardId,
  participantIds,
  placeholder = '재밌게 읽었다면 댓글로 글값을 남겨볼까요?',
  initialContent = '',
  disabled = false,
  onSubmit,
}: MentionableInputProps) {
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
      Paragraph,
      Text,
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: 'rounded bg-primary/10 px-1 text-primary' },
        renderHTML({ options, node }) {
          return [
            'span',
            { ...options.HTMLAttributes, 'data-mention': '', 'data-user-id': node.attrs.id },
            `@${node.attrs.label ?? node.attrs.id}`,
          ];
        },
        suggestion: {
          char: '@',
          items: ({ query }) =>
            filterAndRankCandidates(membersRef.current, query, participantsRef.current).slice(
              0,
              MENTION_LIMIT,
            ),
          render: () => {
            let component: ReactRenderer<MentionListHandle> | null = null;
            let unmount: (() => void) | undefined;
            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, { props, editor: props.editor });
                unmount = props.mount?.(component.element as HTMLElement);
              },
              onUpdate: (props) => component?.updateProps(props),
              onKeyDown: (props) => {
                if (props.event.key === 'Escape') {
                  component?.destroy();
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                unmount?.();
                component?.destroy();
              },
            };
          },
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          'min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-base',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
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

  return (
    <div className="flex w-full items-start space-x-4">
      <div className="flex-1">
        <EditorContent editor={editor} />
      </div>
      <Button
        type="button"
        variant="default"
        size="icon"
        disabled={disabled || submitting}
        aria-label="댓글 등록"
        onClick={() => void handleSubmit()}
      >
        {disabled || submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
      </Button>
    </div>
  );
}
