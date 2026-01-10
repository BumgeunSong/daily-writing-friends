import {
  WEEKS_TO_DISPLAY,
  WEEKDAYS_COUNT,
  DAYS_PER_WEEK,
  SUNDAY,
  SATURDAY,
  MILLISECONDS_PER_DAY,
  GridPosition,
  HasCreatedAt,
} from './types';

export function isWeekendDay(dayOfWeek: number): boolean {
  return dayOfWeek === SUNDAY || dayOfWeek === SATURDAY;
}

function convertToWeekdayColumn(dayOfWeek: number): number {
  return dayOfWeek - 1;
}

function calculateDaysDifferenceFromStart(date: Date, startDate: Date): number {
  return Math.floor((date.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY);
}

function calculateWeekRow(daysDifference: number): number {
  return Math.floor(daysDifference / DAYS_PER_WEEK);
}

function isPositionWithinGridBounds(weekRow: number, weekdayColumn: number): boolean {
  return (
    weekRow >= 0 &&
    weekRow < WEEKS_TO_DISPLAY &&
    weekdayColumn >= 0 &&
    weekdayColumn < WEEKDAYS_COUNT
  );
}

export function calculateGridPosition(date: Date, weeksAgo: Date): GridPosition | null {
  const dayOfWeek = date.getDay();

  if (isWeekendDay(dayOfWeek)) {
    return null;
  }

  const weekdayColumn = convertToWeekdayColumn(dayOfWeek);
  const daysDifference = calculateDaysDifferenceFromStart(date, weeksAgo);
  const weekRow = calculateWeekRow(daysDifference);

  if (isPositionWithinGridBounds(weekRow, weekdayColumn)) {
    return { weekRow, weekdayColumn };
  }

  return null;
}

export function calculateGridPositionDate(
  weeksAgo: Date,
  weekRow: number,
  weekdayColumn: number,
): Date {
  const date = new Date(weeksAgo);
  const offsetDays = weekRow * DAYS_PER_WEEK + weekdayColumn;
  date.setDate(weeksAgo.getDate() + offsetDays);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function normalizeToMidnight(date: Date): void {
  date.setHours(0, 0, 0, 0);
}

function isWeekdayContribution<T extends HasCreatedAt>(contribution: T): boolean {
  const date = new Date(contribution.createdAt);
  const dayOfWeek = date.getDay();
  return !isWeekendDay(dayOfWeek);
}

export function filterWeekdayContributions<T extends HasCreatedAt>(contributions: T[]): T[] {
  return contributions.filter(isWeekdayContribution);
}
