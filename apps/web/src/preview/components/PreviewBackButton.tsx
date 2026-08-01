import { useNavigate } from '@/shared/navigation';
import { Button } from '@/shared/ui/button';
import type React from 'react';

interface PreviewBackButtonProps {
  className?: string;
}

/**
 * Static twin of {@link PostBackButton}. The real back button calls
 * `useViewTransitionNavigate().back()`, which would step out to the previous
 * history entry — potentially a real app route. The preview must stay
 * self-contained, so this always routes to `/preview` (design doc §4
 * navigation isolation).
 */
export const PreviewBackButton: React.FC<PreviewBackButtonProps> = ({ className }) => {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      className={className}
      onClick={() => navigate('/preview')}
      aria-label="돌아가기"
    >
      ← 돌아가기
    </Button>
  );
};
