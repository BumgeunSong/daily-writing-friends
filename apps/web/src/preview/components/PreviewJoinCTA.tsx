import { useNavigate } from '@/shared/navigation';
import { Button } from '@/shared/ui/button';
import type React from 'react';

/**
 * Sticky bottom call-to-action on the preview board. Routes the prospect back to
 * `/join` — the other half of the public entry funnel (design doc §2, §3).
 *
 * Mirrors `IntroCTA`'s persistent footer (`fixed inset-x-0 bottom-0` over a
 * `border-t bg-background` bar with an inner reading-width column) so the join
 * action stays in reach while the visitor scrolls the gallery. The board
 * reserves space with `pb-24` so content never hides behind it.
 */
export const PreviewJoinCTA: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background p-4">
      <div className="mx-auto max-w-3xl px-6 lg:max-w-4xl">
        <Button
          variant="cta"
          size="lg"
          className="w-full"
          onClick={() => navigate('/join')}
        >
          다음 기수에 참여하기
        </Button>
      </div>
    </div>
  );
};
