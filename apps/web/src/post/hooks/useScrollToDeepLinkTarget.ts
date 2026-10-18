import { useEffect } from 'react';

import { useSearchParams } from '@/shared/navigation';
import { resolveDeepLinkScrollTargetId } from '@/post/utils/deepLinkScrollTarget';

/**
 * Time to keep looking for the target element before giving up. Comments render
 * via Suspense after the post paints, so the element is not there on the first
 * frame; a reply target may never appear (its comment stays collapsed), so the
 * search is bounded rather than infinite.
 */
const MAX_WAIT_MS = 3000;

/**
 * When the post page is opened from a notification (`?commentId=`/`?replyId=`),
 * scroll the target comment/reply into view once it has rendered.
 *
 * Runs after the page's force-scroll-to-top layout effect (this is a passive
 * effect, and it defers a frame before the first look), so it does not fight it.
 * If the element never renders within the window it does nothing — the user just
 * stays at the top, no worse than before.
 */
export function useScrollToDeepLinkTarget(): void {
  const [searchParams] = useSearchParams();
  const targetId = resolveDeepLinkScrollTargetId(
    searchParams.get('commentId'),
    searchParams.get('replyId'),
  );

  useEffect(() => {
    if (!targetId) return;

    let rafId = 0;
    let cancelled = false;
    const start = performance.now();

    const tryScroll = () => {
      if (cancelled) return;
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (performance.now() - start < MAX_WAIT_MS) {
        rafId = requestAnimationFrame(tryScroll);
      }
    };

    rafId = requestAnimationFrame(tryScroll);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [targetId]);
}
