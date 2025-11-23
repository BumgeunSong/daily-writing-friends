/**
 * Holiday type definitions for event sourcing system
 *
 * Provides type-safe interfaces for holiday data fetched from Firestore.
 * Holidays are stored in year-sharded documents at /holidays/{year}.
 */

/**
 * Single holiday entry
 */
export interface Holiday {
  date: string; // YYYY-MM-DD format
  name: string;
}

/**
 * Year-sharded holiday collection structure
 * Stored at /holidays/{year} in Firestore
 */
export interface YearHolidays {
  items: Holiday[];
}

/**
 * In-memory holiday lookup map for O(1) date checks
 * Key: YYYY-MM-DD date string
 * Value: Holiday name
 */
export type HolidayMap = Map<string, string>;

/**
 * Create empty holiday map (useful for testing and defaults)
 */
export function createEmptyHolidayMap(): HolidayMap {
  return new Map<string, string>();
}

/**
 * Convert Holiday array to HolidayMap for efficient lookups
 */
export function toHolidayMap(holidays: Holiday[]): HolidayMap {
  const map = new Map<string, string>();
  holidays.forEach((h) => map.set(h.date, h.name));
  return map;
}
