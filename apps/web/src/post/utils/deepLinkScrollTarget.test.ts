import { describe, it, expect } from 'vitest';

import { resolveDeepLinkScrollTargetId } from './deepLinkScrollTarget';

describe('resolveDeepLinkScrollTargetId', () => {
  it('prefers the parent comment, which is always loaded, over a lazy reply', () => {
    expect(resolveDeepLinkScrollTargetId('c-1', 'r-2')).toBe('comment-c-1');
    expect(resolveDeepLinkScrollTargetId('c-1', null)).toBe('comment-c-1');
  });

  it('falls back to the reply element when no parent comment is known', () => {
    expect(resolveDeepLinkScrollTargetId(null, 'r-2')).toBe('reply-r-2');
  });

  it('returns null when there is no comment or reply target', () => {
    expect(resolveDeepLinkScrollTargetId(null, null)).toBeNull();
    expect(resolveDeepLinkScrollTargetId(undefined, undefined)).toBeNull();
  });
});
