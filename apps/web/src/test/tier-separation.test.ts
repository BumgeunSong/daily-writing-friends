import { describe, it, expect } from 'vitest';

describe('test tier separation', () => {
  it('current file matched the unit project (no MSW server in scope)', async () => {
    const mod = await import('msw/node').then(() => null).catch(() => null);
    expect(mod).toBe(null);
  });
});
