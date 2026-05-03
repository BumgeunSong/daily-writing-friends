/**
 * Returns a trigger that ensures `operation` runs at least once after each call,
 * but coalesces concurrent calls during an in-flight operation into a single
 * follow-up run. Used for Manual Save squash semantics on Drafts.
 *
 * Guarantees:
 *  - If no operation is running, the trigger starts one immediately.
 *  - If an operation is running, callers that arrive during it share one
 *    follow-up run that begins after the in-flight operation completes.
 *  - An error in the in-flight operation does not abort the follow-up.
 */
export function createSquashableInvoker(
  operation: () => Promise<void>,
): () => Promise<void> {
  let inFlight: Promise<void> | null = null;
  let queued: Promise<void> | null = null;

  function startFreshOperation(): Promise<void> {
    const operationPromise = operation();
    const wrapper = operationPromise.finally(() => {
      if (inFlight === wrapper) {
        inFlight = null;
      }
    });
    inFlight = wrapper;
    return operationPromise;
  }

  return function trigger(): Promise<void> {
    if (queued !== null) return queued;

    if (inFlight === null) {
      return startFreshOperation();
    }

    queued = inFlight
      .catch(() => undefined)
      .then(() => {
        queued = null;
        return startFreshOperation();
      });
    return queued;
  };
}
