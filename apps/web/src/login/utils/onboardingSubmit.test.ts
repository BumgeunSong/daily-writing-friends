import { describe, expect, it } from 'vitest';
import {
  resolveOnboardingSubmit,
  type OnboardingFormValues,
  type OnboardingSubmitContext,
} from './onboardingSubmit';

const baseValues: OnboardingFormValues = {
  realName: '홍길동',
  nickname: '글쓴이',
  phone: '010-1234-5678',
  kakaoId: 'kakao_user',
  referrer: '추천인',
  activeContactTab: 'phone',
};

describe('resolveOnboardingSubmit', () => {
  it('phone tab + cohort → updateThenWaitlist with phone_number set, kakao_id null', () => {
    const ctx: OnboardingSubmitContext = { uid: 'u1', upcomingBoardId: 'b1', upcomingCohort: 11 };
    const action = resolveOnboardingSubmit(baseValues, ctx);
    expect(action.kind).toBe('updateThenWaitlist');
    if (action.kind === 'updateThenWaitlist') {
      expect(action.profilePayload.phone_number).toBe('01012345678');
      expect(action.profilePayload.kakao_id).toBeNull();
      expect(action.profilePayload.onboarding_complete).toBe(true);
      expect(action.boardId).toBe('b1');
      expect(action.cohort).toBe(11);
      expect(action.navigateTo.path).toBe('/join/complete');
      expect(action.navigateTo.state).toEqual({ name: '홍길동', cohort: 11 });
    }
  });

  it('kakao tab + cohort → kakao_id set, phone_number null', () => {
    const ctx: OnboardingSubmitContext = { uid: 'u1', upcomingBoardId: 'b1', upcomingCohort: 11 };
    const action = resolveOnboardingSubmit({ ...baseValues, activeContactTab: 'kakao' }, ctx);
    expect(action.kind).toBe('updateThenWaitlist');
    if (action.kind === 'updateThenWaitlist') {
      expect(action.profilePayload.kakao_id).toBe('kakao_user');
      expect(action.profilePayload.phone_number).toBeNull();
    }
  });

  it('phone tab + no upcoming cohort → updateOnly, navigates to /boards', () => {
    const ctx: OnboardingSubmitContext = { uid: 'u1', upcomingBoardId: null, upcomingCohort: null };
    const action = resolveOnboardingSubmit(baseValues, ctx);
    expect(action.kind).toBe('updateOnly');
    if (action.kind === 'updateOnly') {
      expect(action.navigateTo.path).toBe('/boards');
      expect(action.profilePayload.onboarding_complete).toBe(true);
    }
  });

  it('kakao tab + no upcoming cohort → updateOnly with kakao_id only', () => {
    const ctx: OnboardingSubmitContext = { uid: 'u1', upcomingBoardId: null, upcomingCohort: null };
    const action = resolveOnboardingSubmit({ ...baseValues, activeContactTab: 'kakao' }, ctx);
    expect(action.kind).toBe('updateOnly');
    if (action.kind === 'updateOnly') {
      expect(action.profilePayload.kakao_id).toBe('kakao_user');
      expect(action.profilePayload.phone_number).toBeNull();
    }
  });

  it('empty referrer becomes null', () => {
    const ctx: OnboardingSubmitContext = { uid: 'u1', upcomingBoardId: 'b1', upcomingCohort: 11 };
    const action = resolveOnboardingSubmit({ ...baseValues, referrer: '   ' }, ctx);
    expect(action.profilePayload.referrer).toBeNull();
  });

  it('trims real_name and nickname', () => {
    const ctx: OnboardingSubmitContext = { uid: 'u1', upcomingBoardId: 'b1', upcomingCohort: 11 };
    const action = resolveOnboardingSubmit(
      { ...baseValues, realName: '  홍길동  ', nickname: ' 글쓴이 ' },
      ctx,
    );
    expect(action.profilePayload.real_name).toBe('홍길동');
    expect(action.profilePayload.nickname).toBe('글쓴이');
  });
});
