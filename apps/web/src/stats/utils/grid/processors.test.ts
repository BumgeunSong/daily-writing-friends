import { describe, it, expect } from 'vitest';
import {
  placeContributionInGrid,
  processContributionsInGrid,
  processPostingContributions,
  processCommentingContributions,
} from './processors';
import { createEmptyMatrices } from './gridMatrix';
import type { Contribution } from '@/stats/model/WritingStats';
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils';

// 4-week posting window: Mon Jan 6, 2025 → Fri Jan 31, 2025
const TIME_RANGE = {
  weeksAgo: new Date(2025, 0, 6, 0, 0, 0, 0),
  today: new Date(2025, 0, 31, 23, 0, 0, 0),
};

describe('placeContributionInGrid', () => {
  it('writes a weekday contribution into the right cell', () => {
    const matrices = createEmptyMatrices();
    const contribution: Contribution = {
      // 2025-01-08 = Wed of week 0 → row 0, col 2
      createdAt: new Date(2025, 0, 8, 12, 0, 0, 0).toISOString(),
      contentLength: 150,
    };

    placeContributionInGrid(
      contribution,
      (c) => (c as Contribution).contentLength ?? 0,
      matrices,
      TIME_RANGE.weeksAgo,
    );

    expect(matrices.matrix[0][2]).toBe(150);
    expect(matrices.weeklyContributions[0][2]).toMatchObject({ contentLength: 150 });
  });

  it('skips a weekend contribution', () => {
    const matrices = createEmptyMatrices();
    const saturday: Contribution = {
      // 2025-01-11 is Saturday
      createdAt: new Date(2025, 0, 11, 12, 0, 0, 0).toISOString(),
      contentLength: 999,
    };

    placeContributionInGrid(
      saturday,
      (c) => (c as Contribution).contentLength ?? 0,
      matrices,
      TIME_RANGE.weeksAgo,
    );

    matrices.matrix.forEach((row) => row.forEach((cell) => expect(cell).toBeNull()));
  });

  it('skips a contribution past the visible window', () => {
    const matrices = createEmptyMatrices();
    const beyond: Contribution = {
      createdAt: new Date(2025, 1, 3, 12, 0, 0, 0).toISOString(), // Mon Feb 3 (week 4)
      contentLength: 999,
    };

    placeContributionInGrid(
      beyond,
      (c) => (c as Contribution).contentLength ?? 0,
      matrices,
      TIME_RANGE.weeksAgo,
    );

    matrices.matrix.forEach((row) => row.forEach((cell) => expect(cell).toBeNull()));
  });
});

describe('processContributionsInGrid', () => {
  it('places in-range weekday contributions and computes the maxValue', () => {
    const matrices = createEmptyMatrices();
    const contributions: Contribution[] = [
      { createdAt: new Date(2025, 0, 6, 12).toISOString(), contentLength: 100 }, // Mon row 0 col 0
      { createdAt: new Date(2025, 0, 8, 12).toISOString(), contentLength: 300 }, // Wed row 0 col 2
      { createdAt: new Date(2025, 0, 15, 12).toISOString(), contentLength: 200 }, // Wed row 1 col 2
    ];

    const { maxValue } = processContributionsInGrid(
      contributions,
      matrices,
      TIME_RANGE.weeksAgo,
      TIME_RANGE.today,
      (c) => c.contentLength ?? 0,
    );

    expect(matrices.matrix[0][0]).toBe(100);
    expect(matrices.matrix[0][2]).toBe(300);
    expect(matrices.matrix[1][2]).toBe(200);
    expect(maxValue).toBe(300);
  });

  it('ignores contributions outside the time range when computing maxValue', () => {
    const matrices = createEmptyMatrices();
    const contributions: Contribution[] = [
      { createdAt: new Date(2025, 0, 8, 12).toISOString(), contentLength: 100 }, // in range
      { createdAt: new Date(2025, 1, 10, 12).toISOString(), contentLength: 9999 }, // out of range
    ];

    const { maxValue } = processContributionsInGrid(
      contributions,
      matrices,
      TIME_RANGE.weeksAgo,
      TIME_RANGE.today,
      (c) => c.contentLength ?? 0,
    );

    expect(maxValue).toBe(100);
  });

  it('returns maxValue 0 when no in-range contributions', () => {
    const matrices = createEmptyMatrices();
    const { maxValue } = processContributionsInGrid(
      [],
      matrices,
      TIME_RANGE.weeksAgo,
      TIME_RANGE.today,
      (c) => (c as Contribution).contentLength ?? 0,
    );
    expect(maxValue).toBe(0);
  });

  it('excludes weekend contributions from maxValue', () => {
    const matrices = createEmptyMatrices();
    const contributions: Contribution[] = [
      { createdAt: new Date(2025, 0, 8, 12).toISOString(), contentLength: 100 }, // Wed
      { createdAt: new Date(2025, 0, 11, 12).toISOString(), contentLength: 9999 }, // Sat
    ];

    const { maxValue } = processContributionsInGrid(
      contributions,
      matrices,
      TIME_RANGE.weeksAgo,
      TIME_RANGE.today,
      (c) => c.contentLength ?? 0,
    );

    expect(maxValue).toBe(100);
  });
});

describe('processPostingContributions', () => {
  it('returns a full GridResult with placeholders, placed values, and maxValue', () => {
    const contributions: Contribution[] = [
      { createdAt: new Date(2025, 0, 8, 12).toISOString(), contentLength: 250 },
    ];

    const result = processPostingContributions(contributions, TIME_RANGE);

    expect(result.matrix[0][2]).toBe(250);
    expect(result.maxValue).toBe(250);
    // Placeholder is present at an untouched cell — same KST date as the cell
    expect(result.weeklyContributions[0][0]).toMatchObject({ contentLength: 0 });
    // Untouched matrix cells remain null
    expect(result.matrix[0][0]).toBeNull();
  });

  it('returns maxValue 0 for empty contributions', () => {
    const result = processPostingContributions([], TIME_RANGE);
    expect(result.maxValue).toBe(0);
    result.matrix.forEach((row) => row.forEach((cell) => expect(cell).toBeNull()));
  });

  it('keeps a no-post day (null contentLength) as an empty cell', () => {
    const contributions: Contribution[] = [
      { createdAt: new Date(2025, 0, 8, 12).toISOString(), contentLength: null },
    ];
    const result = processPostingContributions(contributions, TIME_RANGE);
    // Wed of week 0 → row 0, col 2. No post → cell stays null (gray) and does not inflate maxValue.
    expect(result.matrix[0][2]).toBeNull();
    expect(result.maxValue).toBe(0);
  });

  it('marks a posted-but-empty day (0 contentLength) as activity, distinct from a no-post day', () => {
    // Regression for #291: an image-only / 0-length post must stay distinguishable from a
    // no-post day (null) so the grid agrees with the posting streak instead of showing gray.
    const contributions: Contribution[] = [
      { createdAt: new Date(2025, 0, 8, 12).toISOString(), contentLength: 0 },
    ];
    const result = processPostingContributions(contributions, TIME_RANGE);
    expect(result.matrix[0][2]).toBe(0);
  });
});

describe('processCommentingContributions', () => {
  it('returns a full GridResult using countOfCommentAndReplies as the value', () => {
    const contributions: CommentingContribution[] = [
      {
        createdAt: new Date(2025, 0, 8, 12).toISOString(),
        countOfCommentAndReplies: 5,
      },
      {
        createdAt: new Date(2025, 0, 15, 12).toISOString(),
        countOfCommentAndReplies: 12,
      },
    ];

    const result = processCommentingContributions(contributions, TIME_RANGE);

    expect(result.matrix[0][2]).toBe(5);
    expect(result.matrix[1][2]).toBe(12);
    expect(result.maxValue).toBe(12);
    // Commenting placeholder shape
    expect(result.weeklyContributions[0][0]).toMatchObject({ countOfCommentAndReplies: 0 });
  });

  it('returns maxValue 0 for empty contributions', () => {
    const result = processCommentingContributions([], TIME_RANGE);
    expect(result.maxValue).toBe(0);
  });
});
