import { PREVIEW_BOARD_NAME } from '@/shared/preview-content/previewPosts';
import type React from 'react';

/**
 * Mimics {@link BoardPageHeader}'s bare-title style, but renders a plain,
 * non-link title. The real header wraps the title in `<Link to="/boards/list">`
 * with a chevron — an escape hatch out of the preview. Dropping the link keeps
 * the visitor inside the preview funnel (design doc §4 navigation isolation).
 */
export const PreviewBoardHeader: React.FC = () => {
  return (
    <header className="bg-background pb-1 pt-3">
      <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
        <div className="flex min-h-[44px] items-center p-2">
          <span className="text-xl font-semibold tracking-tight md:text-2xl">
            {PREVIEW_BOARD_NAME}
          </span>
        </div>
      </div>
    </header>
  );
};
