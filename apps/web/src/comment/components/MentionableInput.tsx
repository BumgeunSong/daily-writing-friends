import { EditorContent } from '@tiptap/react';
import { Loader2, Send } from 'lucide-react';

import type { ProseMirrorDoc } from '@/shared/model/ProseMirror';
import { Button } from '@/shared/ui/button';

import { useCommentEditor } from '@/comment/hooks/useCommentEditor';

interface MentionableInputProps {
  boardId: string;
  participantIds?: string[];
  placeholder?: string;
  initialContent?: string;
  disabled?: boolean;
  onSubmit: (content: string, contentJson: ProseMirrorDoc) => Promise<void>;
}

export function MentionableInput({
  boardId,
  participantIds,
  placeholder = '재밌게 읽었다면 댓글로 글값을 남겨볼까요?',
  initialContent = '',
  disabled = false,
  onSubmit,
}: MentionableInputProps) {
  const { editor, submitting, handleSubmit } = useCommentEditor({
    boardId,
    participantIds,
    placeholder,
    initialContent,
    disabled,
    onSubmit,
  });

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
