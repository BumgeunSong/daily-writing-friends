import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Sets `data-vg-ready` only after the fixture's async data has truly settled.
 *
 * The legacy fonts+rAF signal fires the instant the harness commits, which for a
 * data-driven screen is while suspense queries are still pending (CommentList
 * renders null until its reactions prefetch resolves). Instead we watch React
 * Query's in-flight count and require it to reach — and hold — zero across a
 * double-rAF (guarding the momentary 0 between chained queries: comments →
 * reactions prefetch), then run fonts.ready + one more frame. The gate's N=3
 * stability streak is the final backstop against a premature signal.
 *
 * We deliberately do NOT wrap children in a Suspense boundary: fixture screens
 * own their own boundaries (e.g. Comments), and an extra outer boundary here
 * discards their committed subtree on re-suspend, leaving the list unmounted.
 */
// Data loads in waves (comments → reactions prefetch → per-row replies/badges),
// and isFetching briefly hits 0 between waves. Require a run of consecutive quiet
// frames long enough to bridge those gaps before signalling, so we don't capture
// mid-load. The gate's N=3 tree-stability streak is the final backstop.
const QUIET_FRAMES = 20;

function ReadySignal() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let done = false;
    let raf = 0;
    let quietFrames = 0;

    const tick = () => {
      if (done) return;
      quietFrames = queryClient.isFetching() === 0 ? quietFrames + 1 : 0;
      if (quietFrames < QUIET_FRAMES) {
        raf = requestAnimationFrame(tick);
        return;
      }
      done = true;
      void Promise.resolve(document.fonts?.ready).then(() => {
        requestAnimationFrame(() => document.documentElement.setAttribute('data-vg-ready', ''));
      });
    };

    raf = requestAnimationFrame(tick);
    return () => {
      done = true;
      cancelAnimationFrame(raf);
    };
  }, [queryClient]);

  return null;
}

export function SettledGate({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ReadySignal />
    </>
  );
}
