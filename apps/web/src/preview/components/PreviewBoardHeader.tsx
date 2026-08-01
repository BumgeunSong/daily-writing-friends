import { ChevronLeft } from 'lucide-react';
import { useNavigate } from '@/shared/navigation';
import { Button } from '@/shared/ui/button';
import { PREVIEW_BOARD_NAME } from '@/shared/preview-content/previewPosts';
import type React from 'react';

/**
 * Mimics {@link BoardPageHeader}'s bare-title style, but the title itself stays a
 * plain, non-link label — the real header links out to `/boards/list`, a leak out
 * of the funnel we deliberately avoid (design doc §4 navigation isolation).
 *
 * The back chevron routes explicitly to `/join` rather than `navigate(-1)`: it is
 * the funnel's entry point (so this keeps the visitor inside the public
 * `/join ↔ /preview` loop), and an explicit target stays correct even when the
 * visitor deep-links straight to `/preview` with no history to pop — the same
 * reasoning {@link PreviewBackButton} uses on the detail page.
 */
export const PreviewBoardHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-background pb-1 pt-3">
      <div className="container mx-auto flex items-center gap-1 px-3 md:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-foreground hover:bg-transparent hover:text-foreground"
          onClick={() => navigate('/join')}
          aria-label="참여 안내로 돌아가기"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex min-h-[44px] items-center">
          <span className="text-xl font-semibold tracking-tight md:text-2xl">
            {PREVIEW_BOARD_NAME}
          </span>
        </div>
      </div>
    </header>
  );
};
