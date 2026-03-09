/**
 * Firebase Timestamp replacement.
 * Same interface as firebase/firestore Timestamp without the SDK dependency.
 */
export interface FirebaseTimestamp {
  readonly seconds: number;
  readonly nanoseconds: number;
  toDate(): Date;
}

/**
 * Creates a FirebaseTimestamp from a Date object.
 * Replacement for Timestamp.fromDate().
 */
export function createTimestamp(date: Date): FirebaseTimestamp {
  const ms = date.getTime();
  const seconds = Math.floor(ms / 1000);
  const nanoseconds = (ms % 1000) * 1_000_000;
  return {
    seconds,
    nanoseconds,
    toDate() {
      return new Date(seconds * 1000 + nanoseconds / 1_000_000);
    },
  };
}

/**
 * Type guard for FirebaseTimestamp.
 * Replacement for instanceof Timestamp.
 */
export function isTimestamp(val: unknown): val is FirebaseTimestamp {
  return (
    val != null &&
    typeof val === 'object' &&
    'seconds' in val &&
    'nanoseconds' in val &&
    'toDate' in val &&
    typeof (val as Record<string, unknown>).toDate === 'function'
  );
}
