import { describe, expect, it } from 'vitest';
import {
  getSubmitStepOrder,
  resolveOnboardingSubmit,
  type OnboardingFormValues,
  type OnboardingSubmitAction,
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
  it('phone tab + cohort → updateThenWaitlist with phoneNumber set, kakaoId null', () => {
    const ctx: OnboardingSubmitContext = { uid: 'u1', upcomingBoardId: 'b1', upcomingCohort: 11 };
    const action = resolveOnboardingSubmit(baseValues, ctx);
    expect(action.kind).toBe('updateThenWaitlist');
    if (action.kind === 'updateThenWaitlist') {
      expect(action.profilePayload.phoneNumber).toBe('01012345678');
      expect(action.profilePayload.kakaoId).toBeNull();
      expect(action.profilePayload.onboardingComplete).toBeUndefined();
      expect(action.boardId).toBe('b1');
      expect(action.cohort).toBe(11);
      expect(action.navigateTo.path).toBe('/join/complete');
      expect(action.navigateTo.state).toEqual({ name: '홍길동', cohort: 11 });
    }
  });

  it('kakao tab + cohort → kakaoId set, phoneNumber null', () => {
    const ctx: OnboardingSubmitContext = { uid: 'u1', upcomingBoardId: 'b1', upcomingCohort: 11 };
    const action = resolveOnboardingSubmit({ ...baseValues, activeContactTab: 'kakao' }, ctx);
    expect(action.kind).toBe('updateThenWaitlist');
    if (action.kind === 'updateThenWaitlist') {
      expect(action.profilePayload.kakaoId).toBe('kakao_user');
      expect(action.profilePayload.phoneNumber).toBeNull();
    }
  });

  it('phone tab + no upcoming cohort → updateOnly, navigates to /boards', () => {
    const ctx: OnboardingSubmitContext = { uid: 'u1', upcomingBoardId: null, upcomingCohort: null };
    const action = resolveOnboardingSubmit(baseValues, ctx);
    expect(action.kind).toBe('updateOnly');
    if (action.kind === 'updateOnly') {
      expect(action.navigateTo.path).toBe('/boards');
    }
  });

  it('kakao tab + no upcoming cohort → updateOnly with kakaoId only', () => {
    const ctx: OnboardingSubmitContext = { uid: 'u1', upcomingBoardId: null, upcomingCohort: null };
    const action = resolveOnboardingSubmit({ ...baseValues, activeContactTab: 'kakao' }, ctx);
    expect(action.kind).toBe('updateOnly');
    if (action.kind === 'updateOnly') {
      expect(action.profilePayload.kakaoId).toBe('kakao_user');
      expect(action.profilePayload.phoneNumber).toBeNull();
    }
  });

  it('empty referrer becomes null', () => {
    const ctx: OnboardingSubmitContext = { uid: 'u1', upcomingBoardId: 'b1', upcomingCohort: 11 };
    const action = resolveOnboardingSubmit({ ...baseValues, referrer: '   ' }, ctx);
    expect(action.profilePayload.referrer).toBeNull();
  });

  it('trims realName and nickname', () => {
    const ctx: OnboardingSubmitContext = { uid: 'u1', upcomingBoardId: 'b1', upcomingCohort: 11 };
    const action = resolveOnboardingSubmit(
      { ...baseValues, realName: '  홍길동  ', nickname: ' 글쓴이 ' },
      ctx,
    );
    expect(action.profilePayload.realName).toBe('홍길동');
    expect(action.profilePayload.nickname).toBe('글쓴이');
  });
});

describe('getSubmitStepOrder', () => {
  const waitlistAction: OnboardingSubmitAction = {
    kind: 'updateThenWaitlist',
    uid: 'u1',
    boardId: 'b1',
    cohort: 11,
    profilePayload: {},
    navigateTo: { path: '/join/complete', state: { name: '홍길동', cohort: 11 } },
  };

  const updateOnlyAction: OnboardingSubmitAction = {
    kind: 'updateOnly',
    uid: 'u1',
    profilePayload: {},
    navigateTo: { path: '/boards' },
  };

  it('starts with createUser in both modes', () => {
    expect(getSubmitStepOrder(waitlistAction)[0]).toBe('createUser');
    expect(getSubmitStepOrder(updateOnlyAction)[0]).toBe('createUser');
  });

  it('places markComplete LAST when waitlist required', () => {
    const order = getSubmitStepOrder(waitlistAction);
    expect(order[order.length - 1]).toBe('markComplete');
  });

  it('places markComplete LAST in updateOnly mode', () => {
    const order = getSubmitStepOrder(updateOnlyAction);
    expect(order[order.length - 1]).toBe('markComplete');
  });

  it('places writeProfile BEFORE joinWaitlist', () => {
    const order = getSubmitStepOrder(waitlistAction);
    expect(order.indexOf('writeProfile')).toBeLessThan(order.indexOf('joinWaitlist'));
  });

  it('places joinWaitlist BEFORE markComplete', () => {
    const order = getSubmitStepOrder(waitlistAction);
    expect(order.indexOf('joinWaitlist')).toBeLessThan(order.indexOf('markComplete'));
  });

  it('omits joinWaitlist when no cohort', () => {
    const order = getSubmitStepOrder(updateOnlyAction);
    expect(order).not.toContain('joinWaitlist');
  });
});
