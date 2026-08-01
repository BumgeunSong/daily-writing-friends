import { describe, expect, it } from 'vitest';

import { decideAuthTransition } from './authTransitionLogic';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

const sessionUser = {
  id: VALID_UUID,
  email: 'writer@example.com',
  user_metadata: { full_name: '매글프', avatar_url: 'https://example.com/p.png' },
};

describe('decideAuthTransition: user creation planning', () => {
  describe('when SIGNED_IN with a valid user not yet attempted', () => {
    it('plans user creation and state sync', () => {
      const plan = decideAuthTransition('SIGNED_IN', sessionUser, false);

      expect(plan.nextUser?.uid).toBe(VALID_UUID);
      expect(plan.userToCreate).toEqual(plan.nextUser);
      expect(plan.resetAttemptFlag).toBe(false);
    });
  });

  describe('when INITIAL_SESSION restores a session (OAuth redirect)', () => {
    it('plans user creation', () => {
      const plan = decideAuthTransition('INITIAL_SESSION', sessionUser, false);

      expect(plan.userToCreate).not.toBeNull();
    });
  });

  describe('when creation was already attempted', () => {
    it('keeps the user but does not plan creation again', () => {
      const plan = decideAuthTransition('SIGNED_IN', sessionUser, true);

      expect(plan.nextUser?.uid).toBe(VALID_UUID);
      expect(plan.userToCreate).toBeNull();
    });
  });

  describe('when the event is not a sign-in kind', () => {
    it('syncs the user without planning creation', () => {
      const plan = decideAuthTransition('TOKEN_REFRESHED', sessionUser, false);

      expect(plan.nextUser?.uid).toBe(VALID_UUID);
      expect(plan.userToCreate).toBeNull();
    });
  });
});

describe('decideAuthTransition: session parsing and reset', () => {
  describe('when signed out', () => {
    it('clears the user and resets the attempt flag', () => {
      const plan = decideAuthTransition('SIGNED_OUT', null, true);

      expect(plan).toEqual({ nextUser: null, userToCreate: null, resetAttemptFlag: true });
    });
  });

  describe('when the session user has a non-UUID id (E2E stub or corrupt session)', () => {
    it('treats the session as signed out', () => {
      const plan = decideAuthTransition('SIGNED_IN', { id: 'not-a-uuid' }, false);

      expect(plan).toEqual({ nextUser: null, userToCreate: null, resetAttemptFlag: true });
    });
  });

  describe('when mapping the session user', () => {
    it('carries profile fields into nextUser', () => {
      const plan = decideAuthTransition('SIGNED_IN', sessionUser, false);

      expect(plan.nextUser).toEqual({
        uid: VALID_UUID,
        email: 'writer@example.com',
        displayName: '매글프',
        photoURL: 'https://example.com/p.png',
      });
    });
  });
});
