import { Timestamp } from 'firebase-admin/firestore';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Converts a Firestore Timestamp to YYYY-MM-DD string in the given timezone.
 * This ensures dayKey is computed consistently using the user's timezone.
 */
export function computeDayKey(timestamp: Timestamp, timezone: string): string {
  const date = timestamp.toDate();
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}
