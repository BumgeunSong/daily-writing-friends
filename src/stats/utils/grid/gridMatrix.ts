import {
  WEEKS_TO_DISPLAY,
  WEEKDAYS_COUNT,
  ContributionMatrix,
  ContributionDataMatrix,
  ContributionData,
  GridPosition,
  GridResult,
} from './types';

export function createEmptyMatrices(): {
  matrix: ContributionMatrix;
  weeklyContributions: ContributionDataMatrix;
} {
  return {
    matrix: Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(WEEKDAYS_COUNT).fill(null)),
    weeklyContributions: Array.from({ length: WEEKS_TO_DISPLAY }, () =>
      Array(WEEKDAYS_COUNT).fill(null),
    ),
  };
}

export function createEmptyGridResult(): GridResult {
  return {
    matrix: Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(WEEKDAYS_COUNT).fill(null)),
    weeklyContributions: Array.from({ length: WEEKS_TO_DISPLAY }, () =>
      Array(WEEKDAYS_COUNT).fill(null),
    ),
    maxValue: 0,
  };
}

export function updateMatricesAtPosition(
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  position: GridPosition,
  contribution: ContributionData,
  value: number,
): void {
  const { weekRow, weekdayColumn } = position;
  const existingContribution = matrices.weeklyContributions[weekRow][weekdayColumn];

  // Preserve isHoliday and holidayName from placeholder when placing real contribution
  const mergedContribution = {
    ...contribution,
    isHoliday: existingContribution?.isHoliday ?? contribution.isHoliday,
    holidayName: existingContribution?.holidayName ?? contribution.holidayName,
  };

  matrices.matrix[weekRow][weekdayColumn] = value;
  matrices.weeklyContributions[weekRow][weekdayColumn] = mergedContribution;
}
