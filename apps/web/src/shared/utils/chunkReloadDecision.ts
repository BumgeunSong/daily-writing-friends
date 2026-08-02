/**
 * After we reload to recover from a stale chunk, ignore further chunk failures
 * for this long. Without a window, a chunk that fails for a genuine reason (not
 * a retired deploy) would reload the page forever.
 */
export const CHUNK_RELOAD_LOOP_WINDOW_MS = 10_000;

/**
 * Decide whether a failed dynamic import should trigger a recovery reload.
 *
 * A stale-chunk failure after a deploy is cured by a single reload: the fresh
 * index.html references the new hashed chunks. So we reload unless we already
 * reloaded moments ago — a repeat that fast means a reload will not fix it, so
 * we let the error surface to the boundary instead of looping.
 */
export function shouldReloadForChunkFailure(
  nowMs: number,
  lastReloadAtMs: number | null,
  loopWindowMs: number = CHUNK_RELOAD_LOOP_WINDOW_MS,
): boolean {
  if (lastReloadAtMs === null) return true;
  const isWithinLoopWindow = nowMs - lastReloadAtMs <= loopWindowMs;
  return !isWithinLoopWindow;
}
