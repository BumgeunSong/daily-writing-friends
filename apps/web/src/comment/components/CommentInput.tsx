import { MentionableInput } from '@/comment/components/MentionableInput';
import type { ProseMirrorDoc } from '@/shared/model/ProseMirror';
import type React from 'react';

interface CommentInputProps {
  boardId: string;
  participantIds?: string[];
  placeholder?: string;
  initialValue?: string;
  onSubmit: (content: string, contentJson: ProseMirrorDoc) => Promise<void>;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  boardId,
  participantIds,
  placeholder,
  initialValue,
  onSubmit,
}) => {
  return (
    <div className="w-full space-y-4">
      <MentionableInput
        boardId={boardId}
        participantIds={participantIds}
        placeholder={placeholder}
        initialContent={initialValue}
        onSubmit={onSubmit}
      />
    </div>
  );
};
