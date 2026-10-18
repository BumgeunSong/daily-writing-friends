import { useEffect, useRef, type ChangeEvent } from 'react';
import {
  countNonWhitespaceCharacters,
  isWithinCharacterLimit,
  truncateToNonWhitespaceLimit,
} from '@/post/utils/topicInputUtils';
import { Textarea } from '@/shared/ui/textarea';
import { cn } from '@/shared/utils/cn';

export const MAX_ANSWER_LENGTH = 30;

interface PostJustThreeQuestionAnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  questionLabelId: string;
  question: string;
  className?: string;
}

/**
 * 질문이 스킵/다음으로 전환돼도 모바일 키보드가 매번 닫혔다 열리지 않도록
 * textarea 포커스를 유지한다 (같은 컴포넌트 인스턴스가 question만 바꿔 재사용됨).
 */
export function PostJustThreeQuestionAnswerInput({
  value,
  onChange,
  questionLabelId,
  question,
  className,
}: PostJustThreeQuestionAnswerInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [question]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const truncated = isWithinCharacterLimit(e.target.value, MAX_ANSWER_LENGTH)
      ? e.target.value
      : truncateToNonWhitespaceLimit(e.target.value, MAX_ANSWER_LENGTH);
    onChange(truncated);
  };

  const currentCharacterCount = countNonWhitespaceCharacters(value);

  return (
    <div className={className}>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        aria-labelledby={questionLabelId}
        placeholder="30자 이내로 답해보세요"
        className="reading-focus min-h-[4.5rem] resize-none bg-input border-border"
        rows={3}
      />
      <p
        aria-live="polite"
        className={cn('mt-1 text-right text-xs text-muted-foreground tabular-nums')}
      >
        {currentCharacterCount}/{MAX_ANSWER_LENGTH}
      </p>
    </div>
  );
}
