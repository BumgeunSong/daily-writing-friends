import * as Sentry from '@sentry/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type UserRow, mapToUser, parseBoardPermission } from './user.mapper';

function makeUserRow(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'u1',
    real_name: 'Real Name',
    nickname: 'nick',
    email: 'u1@example.com',
    profile_photo_url: 'https://example.com/p.jpg',
    bio: 'hello',
    phone_number: '01000000000',
    kakao_id: 'kakao1',
    referrer: null,
    onboarding_complete: true,
    timezone: null,
    ...overrides,
  };
}

describe('parseBoardPermission', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("'read'를 그대로 통과시킨다", () => {
    expect(parseBoardPermission('read')).toBe('read');
  });

  it("'write'를 그대로 통과시킨다", () => {
    expect(parseBoardPermission('write')).toBe('write');
  });

  // 권한은 접근 제어 값이라, 알 수 없는 값이 write로 새면 권한이 상승한다.
  it('알 수 없는 값은 write로 승격되지 않고 최소 권한 read로 닫혀야 한다', () => {
    vi.spyOn(Sentry, 'captureMessage').mockReturnValue('');
    expect(parseBoardPermission('admin')).toBe('read');
    expect(parseBoardPermission('')).toBe('read');
  });

  it('알 수 없는 값을 Sentry로 보고해 저하가 조용하지 않게 한다', () => {
    const captureMessage = vi.spyOn(Sentry, 'captureMessage').mockReturnValue('');

    parseBoardPermission('admin');

    expect(captureMessage).toHaveBeenCalledWith('Unknown board permission value', {
      level: 'warning',
      extra: { raw: 'admin' },
    });
  });
});

describe('mapToUser', () => {
  it('users 행의 snake_case 컬럼을 User 도메인 필드로 옮긴다', () => {
    const user = mapToUser(
      makeUserRow({ id: 'u9', real_name: 'Kim', profile_photo_url: 'https://x/y.jpg' }),
    );
    expect(user.uid).toBe('u9');
    expect(user.realName).toBe('Kim');
    expect(user.profilePhotoURL).toBe('https://x/y.jpg');
  });

  it('boardPermissions를 주지 않으면 빈 객체로 채운다', () => {
    expect(mapToUser(makeUserRow()).boardPermissions).toEqual({});
  });

  it('전달한 boardPermissions와 knownBuddy를 그대로 싣는다', () => {
    const knownBuddy = { uid: 'b1', nickname: 'buddy', profilePhotoURL: null };
    const user = mapToUser(makeUserRow(), {
      boardPermissions: { board1: 'write' },
      knownBuddy,
    });
    expect(user.boardPermissions).toEqual({ board1: 'write' });
    expect(user.knownBuddy).toEqual(knownBuddy);
  });

  it('timezone이 있으면 profile에 싣고 없으면 profile은 undefined다', () => {
    expect(mapToUser(makeUserRow({ timezone: 'Asia/Seoul' })).profile).toEqual({
      timezone: 'Asia/Seoul',
    });
    expect(mapToUser(makeUserRow({ timezone: null })).profile).toBeUndefined();
  });

  it('onboarding_complete가 null로 새어 들어와도 false로 낮춘다', () => {
    const row = makeUserRow({ onboarding_complete: null as unknown as boolean });
    expect(mapToUser(row).onboardingComplete).toBe(false);
  });
});
