import { describe, it, expect } from 'vitest';

import { createNotificationQueryKey } from './notificationQueryKeys';

describe('createNotificationQueryKey', () => {
  describe('when given a userId', () => {
    it('returns the notifications key tagged with that userId', () => {
      expect(createNotificationQueryKey('user-123')).toEqual(['notifications', 'user-123']);
    });
  });

  describe('when given null', () => {
    it('still returns a key tagged with null so unauthenticated state is distinguishable', () => {
      expect(createNotificationQueryKey(null)).toEqual(['notifications', null]);
    });
  });

  describe('when called repeatedly with the same userId', () => {
    it('returns structurally equal keys', () => {
      const first = createNotificationQueryKey('user-123');
      const second = createNotificationQueryKey('user-123');
      expect(first).toEqual(second);
    });
  });
});
