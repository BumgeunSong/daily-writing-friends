import { describe, it, expect } from 'vitest';
import {
  buildAccessDenialResponse,
  checkBoardAccess,
  mapPostLoaderError,
} from './postLoaderAccess';
import { SupabaseNetworkError } from '@/shared/api/supabaseClient';
import type { User } from '@/user/model/User';

const makeUser = (
  boardPermissions: Record<string, 'read' | 'write'> = {},
): User =>
  ({
    uid: 'u1',
    realName: null,
    nickname: null,
    email: null,
    profilePhotoURL: null,
    bio: null,
    phoneNumber: null,
    kakaoId: null,
    referrer: null,
    onboardingComplete: true,
    boardPermissions,
    updatedAt: null,
  }) as User;

describe('checkBoardAccess', () => {
  describe('when userData is missing', () => {
    it('denies as user-not-found', () => {
      expect(checkBoardAccess(null, 'b1')).toBe('user-not-found');
    });
  });

  describe('when userData has no permission for the board', () => {
    it('denies with no-permission for empty permissions', () => {
      expect(checkBoardAccess(makeUser({}), 'b1')).toBe('no-permission');
    });

    it('denies with no-permission for a different board only', () => {
      expect(checkBoardAccess(makeUser({ otherBoard: 'read' }), 'b1')).toBe('no-permission');
    });
  });

  describe('when userData has read or write permission', () => {
    it('allows read', () => {
      expect(checkBoardAccess(makeUser({ b1: 'read' }), 'b1')).toBeNull();
    });

    it('allows write', () => {
      expect(checkBoardAccess(makeUser({ b1: 'write' }), 'b1')).toBeNull();
    });
  });

  describe('when permission string is unknown', () => {
    it('denies with no-permission (regression guard against typo-permissions like admin)', () => {
      const user = makeUser({ b1: 'admin' as unknown as 'read' });
      expect(checkBoardAccess(user, 'b1')).toBe('no-permission');
    });
  });
});

describe('buildAccessDenialResponse', () => {
  it('returns 403 for user-not-found', async () => {
    const response = buildAccessDenialResponse('user-not-found');
    expect(response.status).toBe(403);
    expect(await response.text()).toBe('User data not found');
  });

  it('returns 403 for no-permission', async () => {
    const response = buildAccessDenialResponse('no-permission');
    expect(response.status).toBe(403);
    expect(await response.text()).toBe('Access denied - insufficient board permissions');
  });
});

describe('mapPostLoaderError', () => {
  describe('when the error is already a Response', () => {
    it('returns the same Response unchanged (preserves permission/auth status codes)', () => {
      const original = new Response('Forbidden', { status: 403 });
      expect(mapPostLoaderError(original)).toBe(original);
    });
  });

  describe('when the error is a SupabaseNetworkError', () => {
    it('returns a 503 response', () => {
      const error = new SupabaseNetworkError({
        message: 'network down',
        details: '',
        hint: '',
        code: '',
      } as never);
      const response = mapPostLoaderError(error);
      expect(response.status).toBe(503);
    });
  });

  describe('when the error is anything else', () => {
    it('returns 404 for a generic Error', () => {
      expect(mapPostLoaderError(new Error('boom')).status).toBe(404);
    });

    it('returns 404 for a non-Error value (string)', () => {
      expect(mapPostLoaderError('unexpected').status).toBe(404);
    });

    it('returns 404 for undefined', () => {
      expect(mapPostLoaderError(undefined).status).toBe(404);
    });
  });
});
