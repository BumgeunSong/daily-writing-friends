import { doc } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { getDoc } from '@/shared/api/trackedFirebase';
import { YearHolidaysSchema, type Holiday } from '@/shared/model/Holiday';

/**
 * Extracts unique years from a date range
 */
function getYearsInRange(startDate: Date, endDate: Date): string[] {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  const years: string[] = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year.toString());
  }

  return years;
}

/**
 * Fetches holidays for a specific year from year-sharded structure
 */
async function fetchHolidaysForYear(year: string): Promise<Holiday[]> {
  try {
    const yearDocRef = doc(firestore, 'holidays', year);
    const snapshot = await getDoc(yearDocRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.data();
    const validated = YearHolidaysSchema.parse(data);

    return validated.items;
  } catch (error) {
    console.error(`Error fetching holidays for year ${year}:`, error);
    return [];
  }
}

/**
 * Fetches holidays for a date range using year-sharded structure
 *
 * @param startDate - Start of date range (typically 4 weeks ago)
 * @param endDate - End of date range (typically today)
 * @returns Array of holidays in the date range
 */
export async function fetchHolidaysForRange(
  startDate: Date,
  endDate: Date,
): Promise<Holiday[]> {
  const years = getYearsInRange(startDate, endDate);

  const yearPromises = years.map((year) => fetchHolidaysForYear(year));
  const yearResults = await Promise.all(yearPromises);
  const allHolidays = yearResults.flat();

  return allHolidays;
}

/**
 * Fetches all configurable holidays (convenience function)
 * Uses current year ± 1 to fetch relevant holidays
 */
export async function fetchHolidays(): Promise<Holiday[]> {
  const today = new Date();
  const lastYear = new Date(today);
  lastYear.setFullYear(today.getFullYear() - 1);
  const nextYear = new Date(today);
  nextYear.setFullYear(today.getFullYear() + 1);

  return fetchHolidaysForRange(lastYear, nextYear);
}
