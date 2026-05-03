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

  describe('after awaiting a trigger whose operation suspends on a microtask', () => {
    it('starts the next call immediately as a fresh in-flight rather than queueing', async () => {
      let invocations = 0;
      const trigger = createSquashableInvoker(async () => {
        invocations += 1;
        await Promise.resolve();
      });

      await trigger();
      expect(invocations).toBe(1);

      const secondCall = trigger();
      // Synchronously after trigger() returns, the operation should already have
      // been called - proving inFlight was cleared before the prior await resumed.
      expect(invocations).toBe(2);
      await secondCall;
    });
  });

  describe('when the follow-up reads from external mutable state', () => {
    it('observes the latest value at the moment the follow-up runs, not a snapshot from the first call', async () => {
      const seenValues: number[] = [];
      let counter = 0;
      const deferreds: Deferred[] = [];
      const trigger = createSquashableInvoker(async () => {
        seenValues.push(counter);
        const deferred = createDeferred();
        deferreds.push(deferred);
        await deferred.promise;
      });

      const firstCall = trigger();
      counter = 1;
      const secondCall = trigger();
      counter = 2;
      const thirdCall = trigger();
      counter = 3;

      expect(seenValues).toEqual([0]);

      deferreds[0].resolve();
      await flushMicrotasks();

      // The follow-up runs once for both queued callers and reads counter at the
      // moment it runs (after counter became 3), not at the moment they were queued.
      expect(seenValues).toEqual([0, 3]);

      deferreds[1].resolve();
      await Promise.all([firstCall, secondCall, thirdCall]);
    });
  });
});
