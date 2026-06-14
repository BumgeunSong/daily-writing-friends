import { describe, expect, it } from 'vitest';
import { deferred } from './deferred';

describe('deferred', () => {
  it('resolves the promise with the value passed to resolve', async () => {
    const d = deferred<number>();
    d.resolve(42);
    await expect(d.promise).resolves.toBe(42);
  });

  it('rejects the promise with the value passed to reject', async () => {
    const d = deferred<number>();
    const error = new Error('boom');
    d.reject(error);
    await expect(d.promise).rejects.toBe(error);
  });

  it('stays pending until resolve is called', async () => {
    const d = deferred<string>();
    const race = await Promise.race([d.promise, Promise.resolve('timeout')]);
    expect(race).toBe('timeout');
    d.resolve('done');
    await expect(d.promise).resolves.toBe('done');
  });

  it('defaults to void when no type parameter is given', async () => {
    const d = deferred();
    d.resolve();
    await expect(d.promise).resolves.toBeUndefined();
  });
});
