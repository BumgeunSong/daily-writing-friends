import { describe, expect, it } from 'vitest';
import type { Board } from '@/board/model/Board';
import {
  getOnboardingHeader,
  getSubmitBlockedReason,
  getSubmitCtaLabel,
  getSubmitErrorMessage,
  isSubmitDisabled,
  SUBMIT_BLOCKED_PREFILL_MESSAGE,
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

  it('never disables for a reason the user cannot see, except the self-explaining submit state', () => {
    const states = [
      base,
      { ...base, hasPrefillError: true },
      { ...base, isSubmitting: true },
    ];

    for (const state of states) {
      const isSilentlyDisabled =
        isSubmitDisabled(state) && getSubmitBlockedReason(state) === null;
      expect(isSilentlyDisabled).toBe(state.isSubmitting);
    }
  });
});

describe('getSubmitBlockedReason', () => {
  const base = {
    isSubmitting: false,
    hasPrefillError: false,
  };

  it('returns null when the CTA is live', () => {
    expect(getSubmitBlockedReason(base)).toBeNull();
  });

  it('explains the prefill failure and how to recover from it', () => {
    expect(getSubmitBlockedReason({ ...base, hasPrefillError: true })).toBe(
      SUBMIT_BLOCKED_PREFILL_MESSAGE,
    );
    expect(SUBMIT_BLOCKED_PREFILL_MESSAGE).toContain('새로고침');
  });

  it('stays silent while submitting because the CTA label already says so', () => {
    expect(getSubmitBlockedReason({ ...base, isSubmitting: true })).toBeNull();
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
