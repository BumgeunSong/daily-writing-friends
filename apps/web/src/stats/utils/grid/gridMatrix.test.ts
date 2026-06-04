import { describe, it, expect } from 'vitest';
import { createEmptyMatrices, createEmptyGridResult, updateMatricesAtPosition } from './gridMatrix';
import type { ContributionData } from './types';
import { WEEKS_TO_DISPLAY, WEEKDAYS_COUNT } from './types';

describe('createEmptyMatrices', () => {
  it('returns a 4×5 matrix and weeklyContributions, all null', () => {
    const { matrix, weeklyContributions } = createEmptyMatrices();
    expect(matrix).toHaveLength(WEEKS_TO_DISPLAY);
    expect(weeklyContributions).toHaveLength(WEEKS_TO_DISPLAY);
    matrix.forEach((row) => {
      expect(row).toHaveLength(WEEKDAYS_COUNT);
      expect(row.every((cell) => cell === null)).toBe(true);
    });
    weeklyContributions.forEach((row) => {
      expect(row).toHaveLength(WEEKDAYS_COUNT);
      expect(row.every((cell) => cell === null)).toBe(true);
    });
  });

  it('returns independent row arrays so mutation does not bleed across rows', () => {
    const { matrix } = createEmptyMatrices();
    matrix[0][0] = 1;
    expect(matrix[1][0]).toBeNull();
  });

  it('returns independent calls so two callers do not share state', () => {
    const a = createEmptyMatrices();
    const b = createEmptyMatrices();
    a.matrix[0][0] = 99;
    expect(b.matrix[0][0]).toBeNull();
  });
});

describe('createEmptyGridResult', () => {
  it('returns a 4×5 matrix, 4×5 weeklyContributions, and maxValue 0', () => {
    const result = createEmptyGridResult();
    expect(result.maxValue).toBe(0);
    expect(result.matrix).toHaveLength(WEEKS_TO_DISPLAY);
    expect(result.weeklyContributions).toHaveLength(WEEKS_TO_DISPLAY);
    expect(result.matrix.every((row) => row.length === WEEKDAYS_COUNT)).toBe(true);
    expect(result.weeklyContributions.every((row) => row.length === WEEKDAYS_COUNT)).toBe(true);
  });
});

describe('updateMatricesAtPosition', () => {
  it('writes the value into the matrix at the given position', () => {
    const matrices = createEmptyMatrices();
    const contribution: ContributionData = { createdAt: '2025-01-06', contentLength: 100 };
    updateMatricesAtPosition(matrices, { weekRow: 1, weekdayColumn: 2 }, contribution, 100);
    expect(matrices.matrix[1][2]).toBe(100);
  });

  it('writes the contribution into weeklyContributions at the given position', () => {
    const matrices = createEmptyMatrices();
    const contribution: ContributionData = { createdAt: '2025-01-06', contentLength: 100 };
    updateMatricesAtPosition(matrices, { weekRow: 0, weekdayColumn: 0 }, contribution, 100);
    expect(matrices.weeklyContributions[0][0]).toMatchObject({
      createdAt: '2025-01-06',
      contentLength: 100,
    });
  });

  it('does not overwrite other cells', () => {
    const matrices = createEmptyMatrices();
    const contribution: ContributionData = { createdAt: '2025-01-06', contentLength: 50 };
    updateMatricesAtPosition(matrices, { weekRow: 2, weekdayColumn: 3 }, contribution, 50);
    // Everything else still null
    matrices.matrix.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (r === 2 && c === 3) return;
        expect(cell).toBeNull();
      });
    });
  });

  it('preserves isHoliday from an existing placeholder when placing a real contribution', () => {
    const matrices = createEmptyMatrices();
    const placeholder: ContributionData = {
      createdAt: '2025-01-06',
      contentLength: 0,
      isHoliday: true,
      holidayName: '신정',
    };
    matrices.weeklyContributions[0][0] = placeholder;

    const realContribution: ContributionData = {
      createdAt: '2025-01-06',
      contentLength: 250,
      // intentionally no isHoliday/holidayName on the incoming contribution
    };
    updateMatricesAtPosition(matrices, { weekRow: 0, weekdayColumn: 0 }, realContribution, 250);

    expect(matrices.weeklyContributions[0][0]).toMatchObject({
      createdAt: '2025-01-06',
      contentLength: 250,
      isHoliday: true,
      holidayName: '신정',
    });
  });

  it('falls back to the contribution’s own isHoliday/holidayName when no placeholder exists', () => {
    const matrices = createEmptyMatrices();
    const contribution: ContributionData = {
      createdAt: '2025-01-06',
      contentLength: 0,
      isHoliday: true,
      holidayName: '한글날',
    };
    updateMatricesAtPosition(matrices, { weekRow: 0, weekdayColumn: 0 }, contribution, 0);
    expect(matrices.weeklyContributions[0][0]).toMatchObject({
      isHoliday: true,
      holidayName: '한글날',
    });
  });

  it('overrides placeholder contentLength with the new contribution value', () => {
    const matrices = createEmptyMatrices();
    matrices.weeklyContributions[0][0] = {
      createdAt: '2025-01-06',
      contentLength: 0,
      isHoliday: true,
      holidayName: '신정',
    };
    const real: ContributionData = { createdAt: '2025-01-06', contentLength: 999 };
    updateMatricesAtPosition(matrices, { weekRow: 0, weekdayColumn: 0 }, real, 999);
    expect((matrices.weeklyContributions[0][0] as { contentLength?: number }).contentLength).toBe(
      999,
    );
  });
});
