import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface PostSubmitButtonProps {
  /**
   * 제출 중 여부
   */
  isSubmitting: boolean;
  /**
   * 제출 비활성화 여부
   */
  disabled?: boolean;
  /**
   * 제출 버튼 문구 (기본값: 게시하기)
   */
  label?: string;
  /**
   * 제출 중 문구 (기본값: 게시 중...)
   */
  submittingLabel?: string;
  /**
   * 추가 CSS 클래스
   */
  className?: string;
}

export function PostSubmitButton({
  isSubmitting,
  disabled = false,
  label = '게시하기',
  submittingLabel = '게시 중...',
  className = 'px-6',
}: PostSubmitButtonProps) {
  return (
    <Button 
      type='submit' 
      className={className}
      disabled={isSubmitting || disabled}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {submittingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
} 