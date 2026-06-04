import { describe, it, expect } from 'vitest';
import { createEmptyMatrices } from './gridMatrix';
import { initializeGridWithPlaceholders } from './placeholders';
import { WEEKS_TO_DISPLAY, WEEKDAYS_COUNT } from './types';

// 4-week window: Mon Jan 6, 2025 → Fri Jan 31, 2025
const WEEKS_AGO_MONDAY = new Date(2025, 0, 6, 0, 0, 0, 0);
const TODAY_FRIDAY = new Date(2025, 0, 31, 12, 0, 0, 0);

describe('initializeGridWithPlaceholders', () => {
  it('fills every cell with a posting placeholder when today covers the full window', () => {
    const matrices = createEmptyMatrices();
    initializeGridWithPlaceholders(matrices, WEEKS_AGO_MONDAY, TODAY_FRIDAY, 'posting');

    for (let row = 0; row < WEEKS_TO_DISPLAY; row++) {
      for (let col = 0; col < WEEKDAYS_COUNT; col++) {
        const cell = matrices.weeklyContributions[row][col];
        expect(cell).not.toBeNull();
        expect(cell).toMatchObject({ contentLength: 0 });
      }
    }
  });

  it('fills every cell with a commenting placeholder when today covers the full window', () => {
    const matrices = createEmptyMatrices();
    initializeGridWithPlaceholders(matrices, WEEKS_AGO_MONDAY, TODAY_FRIDAY, 'commenting');

    for (let row = 0; row < WEEKS_TO_DISPLAY; row++) {
      for (let col = 0; col < WEEKDAYS_COUNT; col++) {
        const cell = matrices.weeklyContributions[row][col];
        expect(cell).not.toBeNull();
        expect(cell).toMatchObject({ countOfCommentAndReplies: 0 });
      }
    }
  });

  it('does not write the count matrix — only weeklyContributions', () => {
    const matrices = createEmptyMatrices();
    initializeGridWithPlaceholders(matrices, WEEKS_AGO_MONDAY, TODAY_FRIDAY, 'posting');
    matrices.matrix.forEach((row) => row.forEach((cell) => expect(cell).toBeNull()));
  });

  it('omits placeholders for cells whose date is after today (today-inclusive bound)', () => {
    const matrices = createEmptyMatrices();
    // today is Wed of the start week (2025-01-08) — only Mon/Tue/Wed of row 0 should fill
    const todayWedWeek0 = new Date(2025, 0, 8, 12, 0, 0, 0);
    initializeGridWithPlaceholders(matrices, WEEKS_AGO_MONDAY, todayWedWeek0, 'posting');

    expect(matrices.weeklyContributions[0][0]).not.toBeNull(); // Mon
    expect(matrices.weeklyContributions[0][1]).not.toBeNull(); // Tue
    expect(matrices.weeklyContributions[0][2]).not.toBeNull(); // Wed
    expect(matrices.weeklyContributions[0][3]).toBeNull(); // Thu — after today
    expect(matrices.weeklyContributions[0][4]).toBeNull(); // Fri — after today
    expect(matrices.weeklyContributions[1][0]).toBeNull(); // next-week Mon — after today
  });

  it('stamps each placeholder with the KST date string for its cell', () => {
    const matrices = createEmptyMatrices();
    initializeGridWithPlaceholders(matrices, WEEKS_AGO_MONDAY, TODAY_FRIDAY, 'posting');
    // (0,0) is Mon Jan 6; (0,4) is Fri Jan 10; (3,4) is Fri Jan 31
    expect((matrices.weeklyContributions[0][0] as { createdAt: string }).createdAt).toBe(
      '2025-01-06',
    );
    expect((matrices.weeklyContributions[0][4] as { createdAt: string }).createdAt).toBe(
      '2025-01-10',
    );
    expect((matrices.weeklyContributions[3][4] as { createdAt: string }).createdAt).toBe(
      '2025-01-31',
    );
  });
});
