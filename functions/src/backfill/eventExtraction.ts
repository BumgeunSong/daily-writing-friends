/**
 * Event Extraction and Batching Functionality
 * 
 * Implements REQ-102: Event Extraction & Ordering
 * Implements REQ-113: Batching (200 postings per batch)
 * 
 * This module handles extracting posting events from Firestore,
 * converting timestamps to KST, and organizing data for simulation.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import admin from '../shared/admin';
import {
  PostingEvent,
  DayBucket,
  BACKFILL_CONSTANTS,
} from './types';
import { isSeoulWorkingDay } from '../shared/calendar';

const KST_TIMEZONE = 'Asia/Seoul';

/**
 * Extract posting events from Firestore for a user within date range
 * REQ-102: Extract events using server timestamps, convert to KST, sort ascending
 */
export async function extractPostingEvents(
  userId: string,
  fromDate: Date,
  asOfDate: Date,
): Promise<PostingEvent[]> {
  if (!userId) {
    throw new Error('userId is required for event extraction');
  }

  const postingsRef = admin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection('postings');

  // Query postings within date range with server timestamp ordering
  const query = postingsRef
    .where('createdAt', '>=', Timestamp.fromDate(fromDate))
    .where('createdAt', '<=', Timestamp.fromDate(asOfDate))
    .orderBy('createdAt', 'asc')
    .limit(BACKFILL_CONSTANTS.MAX_POSTINGS_PER_USER);

  const querySnapshot = await query.get();
  
  if (querySnapshot.empty) {
    return [];
  }

  // Convert Firestore documents to PostingEvent objects
  const events: PostingEvent[] = [];
  
  querySnapshot.docs.forEach(doc => {
    const data = doc.data();
    const serverTimestamp = data.createdAt as Timestamp;
    
    // Convert server timestamp to KST
    const kstTimestamp = toZonedTime(serverTimestamp.toDate(), KST_TIMEZONE);
    const kstDateString = formatInTimeZone(serverTimestamp.toDate(), KST_TIMEZONE, 'yyyy-MM-dd');
    
    events.push({
      id: doc.id,
      boardId: data.board?.id || '',
      title: data.post?.title || '',
      contentLength: data.post?.contentLength || 0,
      serverTimestamp,
      kstTimestamp,
      kstDateString,
    });
  });

  return events;
}

/**
 * Convert server timestamps to KST events (for testing/validation)
 */
export function convertToKstEvents(rawEvents: any[]): PostingEvent[] {
  return rawEvents.map(event => {
    const serverTimestamp = event.serverTimestamp || Timestamp.now();
    const kstTimestamp = toZonedTime(serverTimestamp.toDate(), KST_TIMEZONE);
    const kstDateString = formatInTimeZone(serverTimestamp.toDate(), KST_TIMEZONE, 'yyyy-MM-dd');
    
    return {
      id: event.id,
      boardId: event.boardId || '',
      title: event.title || '',
      contentLength: event.contentLength || 0,
      serverTimestamp,
      kstTimestamp,
      kstDateString,
    };
  });
}

/**
 * Batch posting events into fixed-size batches for processing
 * REQ-113: Process in batches of 200, last batch can be partial
 */
export function batchPostingEvents(events: PostingEvent[]): PostingEvent[][] {
  if (!events.length) {
    return [];
  }

  const batches: PostingEvent[][] = [];
  const batchSize = BACKFILL_CONSTANTS.BATCH_SIZE;
  
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    batches.push(batch);
  }
  
  return batches;
}

/**
 * Group events by KST calendar day for simulation processing
 * REQ-105: Group events by KST day, identify working days
 */
export function groupEventsByDay(events: PostingEvent[]): DayBucket[] {
  if (!events.length) {
    return [];
  }

  // Group events by KST date string
  const dayGroups = new Map<string, PostingEvent[]>();
  
  events.forEach(event => {
    if (!dayGroups.has(event.kstDateString)) {
      dayGroups.set(event.kstDateString, []);
    }
    dayGroups.get(event.kstDateString)!.push(event);
  });

  // Convert to DayBucket objects with working day information
  const dayBuckets: DayBucket[] = [];
  
  for (const [kstDateString, dayEvents] of dayGroups.entries()) {
    const kstDate = new Date(`${kstDateString}T00:00:00+09:00`);
    const isWorkingDay = isSeoulWorkingDay(kstDate);
    
    dayBuckets.push({
      kstDateString,
      kstDate,
      isWorkingDay,
      events: dayEvents.sort((a, b) => a.kstTimestamp.getTime() - b.kstTimestamp.getTime()),
    });
  }

  // Sort day buckets by date
  return dayBuckets.sort((a, b) => a.kstDate.getTime() - b.kstDate.getTime());
}

/**
 * Extract earliest posting date for a user (for 'from' parameter defaulting)
 */
export async function getEarliestPostingDate(userId: string): Promise<Date | null> {
  const postingsRef = admin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection('postings');

  const query = postingsRef
    .orderBy('createdAt', 'asc')
    .limit(1);

  const querySnapshot = await query.get();
  
  if (querySnapshot.empty) {
    return null;
  }

  const firstDoc = querySnapshot.docs[0];
  const createdAt = firstDoc.data().createdAt as Timestamp;
  
  return createdAt.toDate();
}

/**
 * Validate that a user has postings within the date range
 */
export async function validateUserHasPostings(
  userId: string,
  fromDate: Date,
  asOfDate: Date,
): Promise<boolean> {
  const postingsRef = admin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection('postings');

  const query = postingsRef
    .where('createdAt', '>=', Timestamp.fromDate(fromDate))
    .where('createdAt', '<=', Timestamp.fromDate(asOfDate))
    .limit(1);

  const querySnapshot = await query.get();
  
  return !querySnapshot.empty;
}

/**
 * Count total postings for a user (for limit validation)
 */
export async function countUserPostings(userId: string): Promise<number> {
  const postingsRef = admin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection('postings');

  const querySnapshot = await postingsRef.get();
  
  return querySnapshot.size;
}