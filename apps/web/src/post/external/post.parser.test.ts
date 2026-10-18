import * as Sentry from '@sentry/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PostVisibility } from '@/post/model/Post';

import { parsePostVisibility } from './post.parser';

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
