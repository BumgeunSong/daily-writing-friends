import { useNavigate } from '@/shared/navigation';
import { Button } from '@/shared/ui/button';
import type React from 'react';

/**
 * Bottom call-to-action shown at the end of every preview page. Routes the
 * prospect back to `/join` — the other half of the public entry funnel
 * (design doc §2, §3 decision 3).
 *
 * Deliberately NOT `fixed`-positioned (unlike `IntroCTA`): it is an inline,
 * full-width block that flows after the page content so it reads as a natural
 * next step rather than a persistent overlay.
 */
export const PreviewJoinCTA: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mt-8 w-full">
      <Button
        variant="cta"
        size="lg"
        className="w-full"
        onClick={() => navigate('/join')}
      >
        다음 기수에 참여하기
      </Button>
    </div>
  );
};
