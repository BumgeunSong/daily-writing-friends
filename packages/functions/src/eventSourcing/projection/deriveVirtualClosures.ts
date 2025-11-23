import { addDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Event, EventType, DayClosedEvent } from '../types/Event';
import { isWorkingDayByTz, getEndOfDay } from '../utils/workingDayUtils';
import { HolidayMap } from '../types/Holiday';

/**
 * Derive virtual DayClosed events for working days that had no posts.
 * This replaces the need to persist DayClosed events in Firestore.
 *
 * Phase 2.1 on-demand projection: computes closures at read time.
 *
 * @param startDayKey - Start of range (exclusive) in YYYY-MM-DD format
 * @param endDayKey - End of range (inclusive) in YYYY-MM-DD format
 * @param eventsByDayKey - Map of dayKey to events that occurred on that day
 * @param timezone - User's IANA timezone
 * @param holidayMap - Optional pre-fetched holiday map for working day checks
 * @returns Array of virtual DayClosed events for working days with no posts (holidays excluded)
 */
export function deriveVirtualClosures(
  startDayKey: string,
  endDayKey: string,
  eventsByDayKey: Map<string, Event[]>,
  timezone: string,
  holidayMap?: HolidayMap,
): DayClosedEvent[] {
  const virtualClosures: DayClosedEvent[] = [];

  // Parse dates
  let currentDate = addDays(parseISO(startDayKey), 1); // Start from day after startDayKey
  const endDate = parseISO(endDayKey);

  // Iterate through each day in range
  while (currentDate <= endDate) {
    const dayKey = formatInTimeZone(currentDate, timezone, 'yyyy-MM-dd');

    // Check if this is a working day (excludes weekends and holidays)
    if (isWorkingDayByTz(dayKey, timezone, holidayMap)) {
      // Check if any PostCreated events exist for this day
      const eventsOnDay = eventsByDayKey.get(dayKey) || [];
      const hasPostsOnDay = eventsOnDay.some((e) => e.type === EventType.POST_CREATED);

      if (!hasPostsOnDay) {
        // Create virtual DayClosed event
        virtualClosures.push({
          seq: 0, // Virtual events don't have seq (not persisted)
          type: EventType.DAY_CLOSED,
          createdAt: getEndOfDay(dayKey, timezone),
          dayKey,
          idempotencyKey: `virtual:${dayKey}:closed`,
        });
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return virtualClosures;
}
