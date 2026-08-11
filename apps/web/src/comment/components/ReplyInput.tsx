import { MentionableInput } from '@/comment/components/MentionableInput';
import type { ProseMirrorDoc } from '@/shared/model/ProseMirror';
import type React from 'react';

interface ReplyInputProps {
  boardId: string;
  participantIds?: string[];
  placeholder?: string;
  initialValue?: string;
  onSubmit: (content: string, contentJson: ProseMirrorDoc) => Promise<void>;
}

const ReplyInput: React.FC<ReplyInputProps> = ({
  boardId,
  participantIds,
  placeholder = '댓글을 달아줬다면 답을 해주는 게 인지상정!',
  initialValue,
  onSubmit,
}) => {
  return (
    <MentionableInput
      boardId={boardId}
      participantIds={participantIds}
      placeholder={placeholder}
      initialContent={initialValue}
      onSubmit={onSubmit}
    />
  );
};

export default ReplyInput;
