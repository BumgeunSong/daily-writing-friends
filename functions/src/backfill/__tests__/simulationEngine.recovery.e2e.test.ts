import { describe, it, expect } from '@jest/globals';
import { simulateHistoricalStreak } from '../simulationEngine';
import { DayBucket, PostingEvent, SimulationState } from '../types';
import { Timestamp } from 'firebase-admin/firestore';
import { RecoveryStatusType } from '../../recoveryStatus/StreakInfo';

function makeEvent(id: string, date: string, time: string): PostingEvent {
  const kstTimestamp = new Date(`${date}T${time}:00+09:00`);
  return {
    id,
    boardId: 'board:test',
    title: `Post ${id}`,
    contentLength: 100,
    serverTimestamp: Timestamp.fromDate(kstTimestamp),
    kstTimestamp,
    kstDateString: date,
  };
}

function isKstWorkingDay(date: string): boolean {
  const d = new Date(`${date}T00:00:00+09:00`);
  const dow = d.getDay(); // 0 Sun .. 6 Sat
  return dow >= 1 && dow <= 5;
}

function makeBucket(date: string, postTimes: string[]): DayBucket {
  const events = postTimes.map((t, idx) => makeEvent(`${date}-${idx + 1}`, date, t));
  return {
    kstDateString: date,
    kstDate: new Date(`${date}T00:00:00+09:00`),
    isWorkingDay: isKstWorkingDay(date),
    events,
  };
}

describe('SimulationEngine - Friday miss with Saturday recovery (KST)', () => {
  it('creates a recovery event for Friday(25) miss recovered on Saturday(26) with 1 post', async () => {
    // Timeline (KST):
    // 2025-07-21 Mon: 1 post
    // 2025-07-22 Tue: 1 post
    // 2025-07-23 Wed: 1 post
    // 2025-07-24 Thu: 1 post
    // 2025-07-25 Fri: 0 post (miss)
    // 2025-07-26 Sat: 1 post at 00:43 (recovery for Friday)

    const buckets: DayBucket[] = [
      makeBucket('2025-07-21', ['09:00']),
      makeBucket('2025-07-22', ['09:00']),
      makeBucket('2025-07-23', ['09:00']),
      makeBucket('2025-07-24', ['09:00']),
      makeBucket('2025-07-25', []),
      makeBucket('2025-07-26', ['00:43']),
    ];

    const initialState: SimulationState = {
      status: { type: RecoveryStatusType.ON_STREAK },
      currentStreak: 0,
      longestStreak: 0,
      originalStreak: 0,
      lastContributionDate: '',
      lastCalculated: Timestamp.now(),
    };

    const result = await simulateHistoricalStreak(buckets, initialState);

    // Expect exactly one recovery event (Fri -> Sat)
    expect(result.recoveryEvents.length).toBe(1);
    const evt = result.recoveryEvents[0];
    expect(evt.missedDate).toBe('2025-07-25');
    expect(evt.recoveryDate).toBe('2025-07-26');
    expect(evt.postsRequired).toBe(1);
    expect(evt.postsWritten).toBe(1);
    expect(evt.successful).toBe(true);
  });
});

describe('SimulationEngine - Weekday recovery only on eligible next working day (no cross-day accumulation)', () => {
  it('does NOT recover when Wed+Thu are used to try to recover Tue miss (eligible is Wed only)', async () => {
    // Timeline (KST):
    // 2025-08-04 Mon: 1 post
    // 2025-08-05 Tue: 0 post (miss)
    // 2025-08-06 Wed: 1 post (eligible day)
    // 2025-08-07 Thu: 1 post (non-eligible day)
    const buckets: DayBucket[] = [
      makeBucket('2025-08-04', ['09:00']),
      makeBucket('2025-08-05', []),
      makeBucket('2025-08-06', ['09:00']),
      makeBucket('2025-08-07', ['09:00']),
    ];

    const initialState: SimulationState = {
      status: { type: RecoveryStatusType.ON_STREAK },
      currentStreak: 1,
      longestStreak: 1,
      originalStreak: 1,
      lastContributionDate: '2025-08-04',
      lastCalculated: Timestamp.now(),
    };

    const result = await simulateHistoricalStreak(buckets, initialState);

    // Expect NO recovery event for 2025-08-05 (Tue) since Wed had only 1 post (required 2),
    // and Thu (non-eligible) cannot be used to accumulate.
    const hasInvalidRecovery = result.recoveryEvents.some((e) => e.missedDate === '2025-08-05');
    expect(hasInvalidRecovery).toBe(false);

    // Final status should still be eligible or onStreak without Tue recovery being recorded
    // We only assert that no recovery event exists for that miss
  });
});
