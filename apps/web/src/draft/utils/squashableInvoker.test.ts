import { describe, it, expect } from 'vitest';

import { createSquashableInvoker } from './squashableInvoker';

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason?: unknown) => void;
}

function createDeferred(): Deferred {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = () => res();
    reject = rej;
  });
  return { promise, resolve, reject };
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('createSquashableInvoker', () => {
  describe('when called with no operation in flight', () => {
    it('runs the underlying function exactly once', async () => {
      let invocations = 0;
      const trigger = createSquashableInvoker(async () => {
        invocations += 1;
      });

      await trigger();

      expect(invocations).toBe(1);
    });
  });

  describe('when called multiple times concurrently', () => {
    it('runs once for the in-flight call and exactly once more as a follow-up', async () => {
      let invocations = 0;
      const deferreds: Deferred[] = [];
      const trigger = createSquashableInvoker(async () => {
        invocations += 1;
        const deferred = createDeferred();
        deferreds.push(deferred);
        await deferred.promise;
      });

      const firstCall = trigger();
      const secondCall = trigger();
      const thirdCall = trigger();

      expect(invocations).toBe(1);

      deferreds[0].resolve();
      await flushMicrotasks();

      expect(invocations).toBe(2);
      expect(deferreds.length).toBe(2);

      deferreds[1].resolve();
      await Promise.all([firstCall, secondCall, thirdCall]);

      expect(invocations).toBe(2);
    });
  });

  describe('when in-flight operation rejects', () => {
    it('still schedules the follow-up for queued callers', async () => {
      let invocations = 0;
      const deferreds: Deferred[] = [];
      const trigger = createSquashableInvoker(async () => {
        invocations += 1;
        const deferred = createDeferred();
        deferreds.push(deferred);
        await deferred.promise;
      });

      const firstCall = trigger().catch(() => undefined);
      const secondCall = trigger();

      expect(invocations).toBe(1);

      deferreds[0].reject(new Error('boom'));
      await firstCall;
      await flushMicrotasks();

      expect(invocations).toBe(2);

      deferreds[1].resolve();
      await secondCall;
    });
  });

  describe('after a follow-up has run', () => {
    it('serves the next call as a fresh in-flight, not coalesced with the prior batch', async () => {
      let invocations = 0;
      const trigger = createSquashableInvoker(async () => {
        invocations += 1;
      });

      await trigger();
      await trigger();

      expect(invocations).toBe(2);
    });
  });
});
