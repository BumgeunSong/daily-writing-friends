import { shouldReloadForChunkFailure } from './chunkReloadDecision';

const CHUNK_RELOAD_TIMESTAMP_KEY = 'chunkReloadAttemptedAt';

function readLastReloadAt(): number | null {
  const stored = sessionStorage.getItem(CHUNK_RELOAD_TIMESTAMP_KEY);
  if (stored === null) return null;
  const parsed = Number(stored);
  return Number.isNaN(parsed) ? null : parsed;
}

function reloadForFreshChunks(nowMs: number): void {
  sessionStorage.setItem(CHUNK_RELOAD_TIMESTAMP_KEY, String(nowMs));
  window.location.reload();
}

/**
 * Recover from stale-chunk failures after a deploy.
 *
 * Vite fires `vite:preloadError` when a code-split dynamic import can't load —
 * typically because a new deployment replaced the hashed chunk this still-open
 * tab is asking for, and the SPA rewrite serves index.html (text/html) in its
 * place. We swallow the error and reload once so the fresh index.html pulls the
 * new chunks. A repeat failure inside the loop window is left to throw to the
 * error boundary instead of reloading forever.
 *
 * See the Vite build guide, "Load Error Handling".
 */
export function registerChunkReloadHandler(): void {
  window.addEventListener('vite:preloadError', (event) => {
    const nowMs = Date.now();
    if (!shouldReloadForChunkFailure(nowMs, readLastReloadAt())) return;
    event.preventDefault();
    reloadForFreshChunks(nowMs);
  });
}
