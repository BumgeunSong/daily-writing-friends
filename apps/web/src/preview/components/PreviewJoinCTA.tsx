import { useNavigate } from '@/shared/navigation';
import { Button } from '@/shared/ui/button';
import type React from 'react';

/**
 * Call-to-action that routes the prospect back to `/join` — the other half of
 * the public entry funnel (design doc §2, §3). Adapts to viewport width:
 *
 * - **Mobile (`< md`)**: a full-width sticky bottom bar (like `IntroCTA`), with
 *   its inner padding matching the board's `container mx-auto px-3` so the
 *   button's side edges line up with the post cards. The board reserves `pb-24`
 *   so content never hides behind it.
 * - **Desktop (`md+`)**: an extended floating action button pinned bottom-right.
 *   A full-width button reads as a giant banner on wide screens, so the FAB
 *   keeps the action present without dominating the layout. Mirrors the app's
 *   writing FAB conventions (`rounded-full`, `reading-shadow`, hover-scale).
 */
export const PreviewJoinCTA: React.FC = () => {
  const navigate = useNavigate();
  const goToJoin = () => navigate('/join');

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background py-4 md:hidden">
        <div className="container mx-auto px-3">
          <Button variant="cta" size="lg" className="w-full" onClick={goToJoin}>
            다음 기수에 참여하기
          </Button>
        </div>
      </div>

      <Button
        variant="cta"
        size="lg"
        onClick={goToJoin}
        className="reading-shadow reading-focus fixed bottom-8 right-8 z-20 hidden rounded-full px-8 transition-transform duration-200 hover:scale-105 active:scale-[0.99] md:inline-flex"
      >
        다음 기수에 참여하기
      </Button>
    </>
  );
};
