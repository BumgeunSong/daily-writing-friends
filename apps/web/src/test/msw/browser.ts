import { setupWorker } from 'msw/browser';
import type { RequestHandler } from 'msw';

/**
 * Browser-side MSW worker for the visual-gate harness. Kept separate from the
 * node `server.ts` so integration tests never pull in `msw/browser`, and so the
 * gate can install fixture-specific handlers per page load.
 */
export function makeWorker(handlers: RequestHandler[]) {
  return setupWorker(...handlers);
}
