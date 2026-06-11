import { describe, expect, it } from 'vitest';
import type { User } from '@/user/model/User';
import { buildPrefillFormValues, pickInitialContactTab } from './onboardingPrefill';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'u1',
    realName: null,
    nickname: null,
    email: null,
    profilePhotoURL: null,
    bio: null,
    phoneNumber: null,
    kakaoId: null,
    referrer: null,
    onboardingComplete: false,
    boardPermissions: {},
    updatedAt: null,
    ...overrides,
  };
}

describe('pickInitialContactTab', () => {
  it('returns "phone" when there is no existing profile', () => {
    expect(pickInitialContactTab(null)).toBe('phone');
  });

  it('returns "kakao" when only kakaoId is present', () => {
    expect(pickInitialContactTab(makeUser({ kakaoId: 'kakao_user', phoneNumber: null }))).toBe('kakao');
  });

  it('returns "phone" when only phoneNumber is present', () => {
    expect(pickInitialContactTab(makeUser({ phoneNumber: '01012345678', kakaoId: null }))).toBe('phone');
  });

  it('returns "phone" when both phone and kakao are present', () => {
    expect(
      pickInitialContactTab(makeUser({ phoneNumber: '01012345678', kakaoId: 'kakao_user' })),
    ).toBe('phone');
  });

  it('returns "phone" when neither contact is present', () => {
    expect(pickInitialContactTab(makeUser({}))).toBe('phone');
  });
});

describe('buildPrefillFormValues', () => {
  it('returns defaults with displayName-seeded nickname for first-time users', () => {
    const values = buildPrefillFormValues(null, '카카오닉');
    expect(values).toEqual({
      realName: '',
      nickname: '카카오닉',
      phone: '',
      kakaoId: '',
      referrer: '',
      activeContactTab: 'phone',
    });
  });

  it('returns empty defaults when there is no existing user and no displayName', () => {
    expect(buildPrefillFormValues(null, null)).toEqual({
      realName: '',
      nickname: '',
      phone: '',
      kakaoId: '',
      referrer: '',
      activeContactTab: 'phone',
    });
  });

  it('hydrates from existing profile and prefers existing nickname over displayName', () => {
    const existing = makeUser({
      realName: '홍길동',
      nickname: '글쓴이',
      phoneNumber: '01012345678',
      kakaoId: null,
      referrer: '추천인',
    });
    const values = buildPrefillFormValues(existing, '구글닉');
    expect(values).toEqual({
      realName: '홍길동',
      nickname: '글쓴이',
      phone: '01012345678',
      kakaoId: '',
      referrer: '추천인',
      activeContactTab: 'phone',
    });
  });

  it('falls back to displayName when existing nickname is null', () => {
    const existing = makeUser({ nickname: null, kakaoId: 'k', phoneNumber: null });
    const values = buildPrefillFormValues(existing, '구글닉');
    expect(values.nickname).toBe('구글닉');
    expect(values.activeContactTab).toBe('kakao');
  });

  it('picks kakao tab when existing user has kakaoId only', () => {
    const existing = makeUser({ kakaoId: 'kakao_user', phoneNumber: null });
    expect(buildPrefillFormValues(existing, null).activeContactTab).toBe('kakao');
  });

  it('for a first-time user, leaves every non-nickname field at the default', () => {
    // Regression guard for the late-displayName scenario: if `displayName`
    // arrives after the user has begun typing into other fields, we must NOT
    // overwrite realName/phone/kakaoId/referrer. The one-shot guard in
    // useOnboardingPrefill prevents re-runs, but if that guard is ever lost,
    // this test ensures the prefill values themselves never carry non-default
    // data into other fields for the first-time path.
    const values = buildPrefillFormValues(null, '구글닉');
    expect(values.realName).toBe('');
    expect(values.phone).toBe('');
    expect(values.kakaoId).toBe('');
    expect(values.referrer).toBe('');
    expect(values.activeContactTab).toBe('phone');
  });
});
