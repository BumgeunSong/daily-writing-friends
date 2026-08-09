import { describe, expect, it } from 'vitest';

import { filterAndRankCandidates } from './useMentionCandidates';
import type { User } from '@/user/model/User';

function makeUser(overrides: Partial<User> & Pick<User, 'uid'>): User {
  return {
    realName: null,
    nickname: null,
    email: null,
    profilePhotoURL: null,
    bio: null,
    phoneNumber: null,
    kakaoId: null,
    referrer: null,
    onboardingComplete: true,
    boardPermissions: {},
    updatedAt: null,
    ...overrides,
  };
}

const 가나 = makeUser({ uid: 'a', nickname: '가나', email: 'gana@dwf.app' });
const 다라 = makeUser({ uid: 'b', nickname: '다라', email: 'dara@dwf.app' });
const 마바 = makeUser({ uid: 'c', nickname: '마바', email: 'maba@dwf.app' });

const members = [마바, 가나, 다라];

describe('filterAndRankCandidates', () => {
  it('빈 쿼리면 전체 멤버를 가나다순으로 반환한다', () => {
    const result = filterAndRankCandidates(members, '', new Set());
    expect(result.map((m) => m.uid)).toEqual(['a', 'b', 'c']);
  });

  it('nickname 부분일치로 필터한다', () => {
    const result = filterAndRankCandidates(members, '다라', new Set());
    expect(result.map((m) => m.uid)).toEqual(['b']);
  });

  it('email 부분일치로도 필터한다', () => {
    const result = filterAndRankCandidates(members, 'maba', new Set());
    expect(result.map((m) => m.uid)).toEqual(['c']);
  });

  it('대소문자를 무시한다', () => {
    const result = filterAndRankCandidates(members, 'MABA', new Set());
    expect(result.map((m) => m.uid)).toEqual(['c']);
  });

  it('글타래 참여자를 먼저, 그다음 가나다순으로 정렬한다', () => {
    const result = filterAndRankCandidates(members, '', new Set(['c']));
    expect(result.map((m) => m.uid)).toEqual(['c', 'a', 'b']);
  });

  it('nickname이 null인 멤버가 있어도 깨지지 않는다', () => {
    const 익명 = makeUser({ uid: 'z', nickname: null, email: 'anon@dwf.app' });
    const result = filterAndRankCandidates([익명, 가나], '', new Set());
    expect(result.map((m) => m.uid)).toContain('z');
    expect(result.map((m) => m.uid)).toContain('a');
  });
});
