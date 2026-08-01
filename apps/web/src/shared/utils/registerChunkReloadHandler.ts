import * as Sentry from '@sentry/react';
import { shouldReloadForChunkFailure } from './chunkReloadDecision';

const CHUNK_RELOAD_TIMESTAMP_KEY = 'chunkReloadAttemptedAt';

function readLastReloadAt(): number | null {
  try {
    const stored = sessionStorage.getItem(CHUNK_RELOAD_TIMESTAMP_KEY);
    if (stored === null) return null;
    const parsed = Number(stored);
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Persist the reload timestamp, returning whether it stuck. sessionStorage can
 * throw (private mode, quota) — and if we can't remember that we reloaded, we
 * can't guard against an endless reload cycle, so the caller must not reload.
 */
function tryPersistReloadAttempt(nowMs: number): boolean {
  try {
    sessionStorage.setItem(CHUNK_RELOAD_TIMESTAMP_KEY, String(nowMs));
    return true;
  } catch {
    return false;
  }
}

/**
 * Leave a trace before the reload throws the JS context away. Without it an
 * auto-reload is invisible: we lose the deploy-health signal (how often stale
 * chunks bite) and the eventual error-boundary report for a persistent failure
 * has no history explaining the earlier reload. Sent as a warning message, not
 * the raw error, because the common stale-chunk cause is a NetworkError that
 * Sentry's IGNORED_ERRORS filters out.
 */
function reportChunkReloadRecovery(payload: unknown): void {
  Sentry.captureMessage(`vite:preloadError auto-reload: ${String(payload)}`, 'warning');
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
    if (!tryPersistReloadAttempt(nowMs)) return;
    event.preventDefault();
    reportChunkReloadRecovery(event.payload);
    window.location.reload();
  });
}
