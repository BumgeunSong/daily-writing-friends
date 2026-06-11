import { describe, expect, it } from 'vitest';
import type { Board } from '@/board/model/Board';
import type { OnboardingSubmitAction } from './onboardingSubmit';
import {
  getNavigateArgs,
  getOnboardingHeader,
  getSubmitCtaLabel,
  getSubmitErrorMessage,
  isSubmitDisabled,
} from './onboardingDerived';

function makeBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: 'b1',
    title: '매글프',
    description: null,
    ...overrides,
  } as Board;
}

describe('getOnboardingHeader', () => {
  it('returns generic copy when there is no upcoming board', () => {
    const header = getOnboardingHeader(null);
    expect(header.title).toBe('프로필을 입력해주세요');
    expect(header.subtitle).toBe('아래 정보를 채우면 다음 기수가 열릴 때 안내드려요.');
  });

  it('returns generic copy when upcomingBoard has no cohort or firstDay', () => {
    expect(getOnboardingHeader(makeBoard())).toEqual({
      title: '프로필을 입력해주세요',
      subtitle: '아래 정보를 채우면 다음 기수가 열릴 때 안내드려요.',
    });
  });

  it('uses cohort-specific title when cohort is set', () => {
    const header = getOnboardingHeader(makeBoard({ cohort: 11 }));
    expect(header.title).toBe('매글프 11기 신청하기');
  });

  it('uses localized date subtitle when firstDay is set', () => {
    const board = makeBoard({
      cohort: 11,
      firstDay: { toDate: () => new Date('2026-03-05T00:00:00') } as Board['firstDay'],
    });
    const header = getOnboardingHeader(board);
    expect(header.title).toBe('매글프 11기 신청하기');
    expect(header.subtitle).toContain('시작합니다.');
  });
});

describe('getSubmitCtaLabel', () => {
  it('returns submitting label while submitting regardless of cohort', () => {
    expect(getSubmitCtaLabel({ isSubmitting: true, hasCohort: true })).toBe('신청 중...');
    expect(getSubmitCtaLabel({ isSubmitting: true, hasCohort: false })).toBe('신청 중...');
  });

  it('returns 신청하기 when cohort is open', () => {
    expect(getSubmitCtaLabel({ isSubmitting: false, hasCohort: true })).toBe('신청하기');
  });

  it('returns 저장하기 when no cohort', () => {
    expect(getSubmitCtaLabel({ isSubmitting: false, hasCohort: false })).toBe('저장하기');
  });
});

describe('isSubmitDisabled', () => {
  const base = {
    isSubmitting: false,
    hasPrefillError: false,
    requiresCohortAgreement: false,
    hasAgreedToCohort: false,
  };

  it('is enabled in the simple case', () => {
    expect(isSubmitDisabled(base)).toBe(false);
  });

  it('is disabled while submitting', () => {
    expect(isSubmitDisabled({ ...base, isSubmitting: true })).toBe(true);
  });

  it('is disabled when prefill failed', () => {
    expect(isSubmitDisabled({ ...base, hasPrefillError: true })).toBe(true);
  });

  it('is disabled when cohort agreement is required but missing', () => {
    expect(
      isSubmitDisabled({ ...base, requiresCohortAgreement: true, hasAgreedToCohort: false }),
    ).toBe(true);
  });

  it('is enabled when cohort agreement is required and given', () => {
    expect(
      isSubmitDisabled({ ...base, requiresCohortAgreement: true, hasAgreedToCohort: true }),
    ).toBe(false);
  });
});

describe('getNavigateArgs', () => {
  it('passes through path with state for updateThenWaitlist', () => {
    const action: OnboardingSubmitAction = {
      kind: 'updateThenWaitlist',
      uid: 'u1',
      boardId: 'b1',
      cohort: 11,
      profilePayload: {} as OnboardingSubmitAction extends { profilePayload: infer P } ? P : never,
      navigateTo: { path: '/join/complete', state: { name: '홍길동', cohort: 11 } },
    };
    expect(getNavigateArgs(action)).toEqual({
      path: '/join/complete',
      options: { state: { name: '홍길동', cohort: 11 } },
    });
  });

  it('returns path-only args for updateOnly', () => {
    const action: OnboardingSubmitAction = {
      kind: 'updateOnly',
      uid: 'u1',
      profilePayload: {} as OnboardingSubmitAction extends { profilePayload: infer P } ? P : never,
      navigateTo: { path: '/boards' },
    };
    expect(getNavigateArgs(action)).toEqual({ path: '/boards' });
  });
});

describe('getSubmitErrorMessage', () => {
  it('extracts Error.message', () => {
    expect(getSubmitErrorMessage(new Error('대기자 명단에 추가하는 중 오류가 발생했습니다.'))).toBe(
      '대기자 명단에 추가하는 중 오류가 발생했습니다.',
    );
  });

  it('falls back when input is not an Error', () => {
    expect(getSubmitErrorMessage('random')).toBe('신청에 실패했습니다. 잠시 후 다시 시도해주세요.');
    expect(getSubmitErrorMessage(undefined)).toBe('신청에 실패했습니다. 잠시 후 다시 시도해주세요.');
  });
});
