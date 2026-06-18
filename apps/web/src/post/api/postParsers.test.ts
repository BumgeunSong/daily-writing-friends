import { describe, expect, it } from 'vitest';

import { PostVisibility } from '@/post/model/Post';

import { parsePostVisibility } from './postParsers';

describe('parsePostVisibility', () => {
  it('passes through PUBLIC', () => {
    expect(parsePostVisibility('public')).toBe(PostVisibility.PUBLIC);
  });

  it('passes through PRIVATE', () => {
    expect(parsePostVisibility('private')).toBe(PostVisibility.PRIVATE);
  });

  it('falls back to PUBLIC for an unknown string (instead of trusting the cast)', () => {
    expect(parsePostVisibility('leaked-by-bug')).toBe(PostVisibility.PUBLIC);
  });

  it('falls back to PUBLIC for null', () => {
    expect(parsePostVisibility(null)).toBe(PostVisibility.PUBLIC);
  });

  it('falls back to PUBLIC for undefined', () => {
    expect(parsePostVisibility(undefined)).toBe(PostVisibility.PUBLIC);
  });

  it('falls back to PUBLIC for empty string', () => {
    expect(parsePostVisibility('')).toBe(PostVisibility.PUBLIC);
  });
});
