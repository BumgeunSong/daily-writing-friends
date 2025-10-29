import { Timestamp } from 'firebase-admin/firestore';
import { Event, EventType } from '../types/Event';

/**
 * Posting document from Firestore (external shape)
 */
export interface PostingDocument {
  post: {
    id: string;
    contentLength: number;
  };
  board: {
    id: string;
  };
  createdAt: Timestamp;
}

/**
 * Pure function: Extract events from posting documents
 *
 * Business Rules:
 * 1. Events are ordered by posting createdAt (chronological)
 * 2. seq starts from startSeq and increments sequentially
 * 3. dayKey is computed from posting createdAt + user timezone
 * 4. Skip postings with missing required fields
 *
 * @param postings - Array of posting documents (must be sorted by createdAt ASC)
 * @param timezone - User timezone for dayKey computation
 * @param startSeq - Starting sequence number (default: 1)
 * @returns Array of events ordered by seq
 */
export function extractEventsFromPostings(
  postings: PostingDocument[],
  timezone: string,
  startSeq = 1,
): Event[] {
  const events: Event[] = [];
  let seq = startSeq;

  for (const posting of postings) {
    // Skip invalid postings
    if (!posting.post?.id || !posting.createdAt) {
      continue;
    }

    const dayKey = computeDayKeyFromTimestamp(posting.createdAt, timezone);

    const event: Event = {
      seq,
      type: EventType.POST_CREATED,
      createdAt: posting.createdAt,
      dayKey,
      payload: {
        postId: posting.post.id,
        boardId: posting.board?.id || 'unknown',
        contentLength: posting.post.contentLength || 0,
      },
    };

    events.push(event);
    seq++;
  }

  return events;
}

/**
 * Pure helper: Compute dayKey from Timestamp
 */
function computeDayKeyFromTimestamp(timestamp: Timestamp, timezone: string): string {
  const date = timestamp.toDate();

  // Convert to timezone
  const dateStr = date.toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Parse MM/DD/YYYY to YYYY-MM-DD
  const [month, day, year] = dateStr.split(/[/,\s]+/);
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Pure function: Detect existing events to avoid duplicates
 *
 * @param eventsToCreate - New events to be created
 * @param existingPostIds - Set of postIds that already have events
 * @returns Filtered events that don't duplicate existing ones
 */
export function filterDuplicateEvents(
  eventsToCreate: Event[],
  existingPostIds: Set<string>,
): Event[] {
  return eventsToCreate.filter(event => {
    if (event.type !== EventType.POST_CREATED) return true;
    return !existingPostIds.has(event.payload.postId);
  });
}

/**
 * Pure function: Renumber events sequentially after filtering
 *
 * @param events - Events to renumber
 * @param startSeq - Starting sequence number
 * @returns Events with updated seq numbers
 */
export function renumberEvents(events: Event[], startSeq: number): Event[] {
  return events.map((event, index) => ({
    ...event,
    seq: startSeq + index,
  }));
}
