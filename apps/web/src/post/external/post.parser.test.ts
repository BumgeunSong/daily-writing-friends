import * as Sentry from '@sentry/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PostVisibility } from '@/post/model/Post';

import { parsePostContentJson, parsePostVisibility } from './post.parser';

describe('parsePostVisibility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes through PUBLIC', () => {
    expect(parsePostVisibility('public')).toBe(PostVisibility.PUBLIC);
  });

  it('passes through PRIVATE', () => {
    expect(parsePostVisibility('private')).toBe(PostVisibility.PRIVATE);
  });

  // Visibility is an access-control field: unknown values must fail closed to
  // PRIVATE so a corrupted value hides a post rather than leaking it (#705).
  it('fails closed to PRIVATE for an unknown string', () => {
    expect(parsePostVisibility('leaked-by-bug')).toBe(PostVisibility.PRIVATE);
  });

  it('fails closed to PRIVATE for null', () => {
    expect(parsePostVisibility(null)).toBe(PostVisibility.PRIVATE);
  });

  it('fails closed to PRIVATE for undefined', () => {
    expect(parsePostVisibility(undefined)).toBe(PostVisibility.PRIVATE);
  });

  it('fails closed to PRIVATE for empty string', () => {
    expect(parsePostVisibility('')).toBe(PostVisibility.PRIVATE);
  });

  it('reports the unknown value to Sentry so the degrade is not silent', () => {
    const captureMessage = vi.spyOn(Sentry, 'captureMessage').mockReturnValue('');

    parsePostVisibility('leaked-by-bug');

    expect(captureMessage).toHaveBeenCalledWith('Unknown post visibility value', {
      level: 'warning',
      extra: { raw: 'leaked-by-bug' },
    });
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
