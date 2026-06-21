import { describe, expect, it } from 'vitest';

import { PostVisibility } from '@/post/model/Post';

import { parsePostContentJson, parsePostVisibility } from './postParsers';

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

describe('parsePostContentJson', () => {
  it('returns undefined for null', () => {
    expect(parsePostContentJson(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(parsePostContentJson(undefined)).toBeUndefined();
  });

  it('parses a minimal valid doc', () => {
    const result = parsePostContentJson({ type: 'doc' });
    expect(result).toEqual({ type: 'doc' });
  });

  it('parses a doc with nested nodes and marks', () => {
    const input = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'hello', marks: [{ type: 'bold' }] },
          ],
        },
      ],
    };
    expect(parsePostContentJson(input)).toEqual(input);
  });

  it('rejects doc with wrong top-level type', () => {
    expect(parsePostContentJson({ type: 'paragraph' })).toBeUndefined();
  });

  it('rejects malformed shape (object with no type)', () => {
    expect(parsePostContentJson({ foo: 'bar' })).toBeUndefined();
  });

  it('rejects non-object inputs', () => {
    expect(parsePostContentJson('string')).toBeUndefined();
    expect(parsePostContentJson(42)).toBeUndefined();
    expect(parsePostContentJson([])).toBeUndefined();
  });
});
