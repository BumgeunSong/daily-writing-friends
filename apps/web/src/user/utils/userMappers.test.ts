import { describe, it, expect } from 'vitest';
import { mapUserToSupabaseUpdate, mapBoardPermissionsToRows } from './userMappers';

describe('mapUserToSupabaseUpdate — full mapping', () => {
  it('maps all user fields to snake_case columns', () => {
    const result = mapUserToSupabaseUpdate({
      realName: 'John',
      nickname: 'johnny',
      email: 'john@test.com',
      profilePhotoURL: 'https://example.com/photo.jpg',
      bio: 'Hello',
      phoneNumber: '010-1234-5678',
      kakaoId: 'johnny_kakao',
      referrer: 'friend',
      onboardingComplete: true,
    });
    expect(result).toEqual({
      real_name: 'John',
      nickname: 'johnny',
      email: 'john@test.com',
      profile_photo_url: 'https://example.com/photo.jpg',
      bio: 'Hello',
      phone_number: '010-1234-5678',
      kakao_id: 'johnny_kakao',
      referrer: 'friend',
      onboarding_complete: true,
    });
  });
});

describe('mapUserToSupabaseUpdate — partial / negative cases', () => {
  it('returns empty object when no mappable fields provided', () => {
    expect(mapUserToSupabaseUpdate({})).toEqual({});
  });

  it('includes only provided fields', () => {
    const result = mapUserToSupabaseUpdate({ nickname: 'new-nick' });
    expect(result).toEqual({ nickname: 'new-nick' });
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('preserves null values', () => {
    const result = mapUserToSupabaseUpdate({
      realName: null,
      bio: null,
    });

    expect(result).toEqual({
      real_name: null,
      bio: null,
    });
  });

  it('ignores fields not in the mapping (e.g. uid, boardPermissions)', () => {
    const result = mapUserToSupabaseUpdate({
      uid: 'user-1',
      boardPermissions: { 'board-1': 'read' },
    });

    expect(result).toEqual({});
  });

  it('does not allow arbitrary keys on the return type', () => {
    const result = mapUserToSupabaseUpdate({ nickname: 'test' });
    // @ts-expect-error - typo_column should not exist on SupabaseUserUpdate
    void result.typo_column;
  });
});

describe('mapUserToSupabaseUpdate — new fields (integrate-signup-cohort-flow)', () => {
  it('maps kakaoId → kakao_id', () => {
    expect(mapUserToSupabaseUpdate({ kakaoId: 'only_kakao' })).toEqual({ kakao_id: 'only_kakao' });
  });

  it('maps onboardingComplete → onboarding_complete (false case)', () => {
    expect(mapUserToSupabaseUpdate({ onboardingComplete: false })).toEqual({ onboarding_complete: false });
  });

  it('preserves explicit null kakao_id (clearing the field)', () => {
    expect(mapUserToSupabaseUpdate({ kakaoId: null })).toEqual({ kakao_id: null });
  });
});

describe('mapBoardPermissionsToRows', () => {
  it('converts permissions object to row array', () => {
    const result = mapBoardPermissionsToRows('user-1', {
      'board-a': 'read',
      'board-b': 'write',
    });

    expect(result).toEqual([
      { user_id: 'user-1', board_id: 'board-a', permission: 'read' },
      { user_id: 'user-1', board_id: 'board-b', permission: 'write' },
    ]);
  });

  it('returns empty array for empty permissions', () => {
    expect(mapBoardPermissionsToRows('user-1', {})).toEqual([]);
  });

  it('handles single permission', () => {
    const result = mapBoardPermissionsToRows('user-1', { 'board-x': 'write' });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      user_id: 'user-1',
      board_id: 'board-x',
      permission: 'write',
    });
  });
});
