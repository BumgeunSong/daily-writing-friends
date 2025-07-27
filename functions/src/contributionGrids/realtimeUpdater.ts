import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { Posting } from '../postings/Posting';
import { Commenting } from '../commentings/Commenting';
import { toSeoulDate } from '../shared/dateUtils';
import { ActivityType, ContributionGrid } from './types';
import {
  formatDate,
  updateContributionForDate,
  sortAndLimitContributions,
  calculateMaxValue,
  calculateTimeRange,
} from './gridUtils';

// Contribution grid 업데이트를 위한 타입
export interface ContributionGridDBUpdate {
  userId: string;
  activityType: ActivityType;
  date: string; // YYYY-MM-DD
  value: number;
  reason: string;
  // 메타데이터 필드들
  maxValue: number;
  lastUpdated: Timestamp;
  timeRange: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  };
}

/**
 * Extract creation date from posting data
 */
function extractPostingDate(postingData: Posting): Date {
  if (postingData.createdAt) {
    return postingData.createdAt.toDate();
  } else {
    console.warn(
      `[ContributionGrid] Warning: createdAt is missing for posting, using current Seoul time as fallback`,
    );
    return toSeoulDate(new Date());
  }
}

/**
 * Extract creation date from commenting data
 */
function extractCommentingDate(commentingData: Commenting): Date {
  if (commentingData.createdAt) {
    return commentingData.createdAt.toDate();
  } else {
    console.warn(
      `[ContributionGrid] Warning: createdAt is missing for commenting, using current Seoul time as fallback`,
    );
    return toSeoulDate(new Date());
  }
}

/**
 * Calculate posting value from posting data
 */
function calculatePostingValue(postingData: Posting): number {
  return Math.max(1, postingData.post?.contentLength || 1);
}

/**
 * Calculate commenting value (always 1)
 */
function calculateCommentingValue(): number {
  return 1;
}

/**
 * Convert date to Seoul timezone and format as YYYY-MM-DD
 */
function convertToSeoulDateString(date: Date): string {
  const seoulDate = toSeoulDate(date);
  return formatDate(seoulDate);
}

/**
 * 빈 contribution grid 생성
 */
function createEmptyContributionGrid(date: string): ContributionGrid {
  return {
    contributions: [],
    maxValue: 0,
    lastUpdated: Timestamp.now(),
    timeRange: {
      startDate: date,
      endDate: date,
    },
  };
}

/**
 * 메타데이터를 포함한 contribution grid 업데이트 계산
 */
function calculateContributionGridUpdate(
  existingGrid: ContributionGrid,
  date: string,
  value: number,
  activityType: ActivityType,
  reason: string,
): ContributionGridDBUpdate {
  // 1. 기존 contributions에 새 값 추가
  const updatedContributions = updateContributionForDate(existingGrid.contributions, date, value);

  // 2. contributions를 정렬하고 20개로 제한
  const sortedContributions = sortAndLimitContributions(updatedContributions);

  // 3. 메타데이터 계산
  const maxValue = calculateMaxValue(sortedContributions);
  const timeRange = calculateTimeRange(sortedContributions, date);

  return {
    userId: '', // 이 값은 호출하는 함수에서 설정
    activityType,
    date,
    value,
    reason,
    maxValue,
    lastUpdated: Timestamp.now(),
    timeRange,
  };
}

/**
 * 포스팅 생성 시 contribution grid 업데이트 계산 (순수 함수)
 */
export function calculatePostingContributionUpdate(
  userId: string,
  postingData: Posting,
  existingGrid: ContributionGrid | null = null,
): ContributionGridDBUpdate | null {
  try {
    const postCreatedAt = extractPostingDate(postingData);
    const dateStr = convertToSeoulDateString(postCreatedAt);
    const value = calculatePostingValue(postingData);

    console.log(
      `[ContributionGrid] Posting contribution update: ${userId}, ${dateStr}, value: ${value}`,
    );

    // 기존 그리드가 없으면 빈 그리드 생성
    const grid = existingGrid || createEmptyContributionGrid(dateStr);

    // 메타데이터를 포함한 업데이트 계산
    const update = calculateContributionGridUpdate(
      grid,
      dateStr,
      value,
      ActivityType.POSTING,
      `Posting created with ${value} characters`,
    );

    // userId 설정
    update.userId = userId;

    return update;
  } catch (error) {
    console.error(
      `[ContributionGrid] Error calculating posting contribution update for user ${userId}:`,
      error,
    );
    return null;
  }
}

/**
 * 댓글 생성 시 contribution grid 업데이트 계산 (순수 함수)
 */
export function calculateCommentingContributionUpdate(
  userId: string,
  commentingData: Commenting,
  existingGrid: ContributionGrid | null = null,
): ContributionGridDBUpdate | null {
  try {
    const commentCreatedAt = extractCommentingDate(commentingData);
    const dateStr = convertToSeoulDateString(commentCreatedAt);
    const value = calculateCommentingValue();

    console.log(
      `[ContributionGrid] Commenting contribution update: ${userId}, ${dateStr}, value: ${value}`,
    );

    // 기존 그리드가 없으면 빈 그리드 생성
    const grid = existingGrid || createEmptyContributionGrid(dateStr);

    // 메타데이터를 포함한 업데이트 계산
    const update = calculateContributionGridUpdate(
      grid,
      dateStr,
      value,
      ActivityType.COMMENTING,
      `Comment created`,
    );

    // userId 설정
    update.userId = userId;

    return update;
  } catch (error) {
    console.error(
      `[ContributionGrid] Error calculating commenting contribution update for user ${userId}:`,
      error,
    );
    return null;
  }
}

/**
 * Contribution grid 업데이트 적용 (side effect만 담당)
 */
export async function applyContributionGridUpdate(update: ContributionGridDBUpdate): Promise<void> {
  try {
    const admin = require('../shared/admin').default;
    const db = admin.firestore();
    const docId = `${update.userId}_${update.activityType}`;
    const docRef = db.collection('contributionGrids').doc(docId);

    // 업데이트된 contributions 계산
    const updatedContributions = updateContributionForDate(
      [], // 빈 배열에서 시작 (기존 로직은 calculateContributionGridUpdate에서 처리됨)
      update.date,
      update.value,
    );
    const sortedContributions = sortAndLimitContributions(updatedContributions);

    // 메타데이터를 포함한 완전한 그리드 객체 생성
    const updatedGrid: ContributionGrid = {
      contributions: sortedContributions,
      maxValue: update.maxValue,
      lastUpdated: update.lastUpdated,
      timeRange: update.timeRange,
    };

    // Firestore에 저장 (side effect)
    await docRef.set(updatedGrid);

    console.log(`[ContributionGrid] Successfully applied update: ${update.reason}`);
  } catch (error) {
    console.error(`[ContributionGrid] Error applying contribution grid update:`, error);
    throw error;
  }
}

/**
 * Process posting contribution update
 */
async function processPostingContribution(userId: string, postingData: Posting): Promise<void> {
  console.log(`[ContributionGrid] Processing posting contribution update for user: ${userId}`);

  try {
    // 기존 그리드 읽기
    const admin = require('../shared/admin').default;
    const db = admin.firestore();
    const docId = `${userId}_${ActivityType.POSTING}`;
    const docRef = db.collection('contributionGrids').doc(docId);

    const docSnap = await docRef.get();
    const existingGrid = docSnap.exists ? (docSnap.data() as ContributionGrid) : null;

    // 순수 함수로 업데이트 계산
    const update = calculatePostingContributionUpdate(userId, postingData, existingGrid);

    if (update) {
      await applyContributionGridUpdate(update);
      console.log(
        `[ContributionGrid] Successfully processed posting contribution for user: ${userId}`,
      );
    }
  } catch (error) {
    console.error(
      `[ContributionGrid] Error processing posting contribution for user ${userId}:`,
      error,
    );
  }
}

/**
 * Process commenting contribution update
 */
async function processCommentingContribution(
  userId: string,
  commentingData: Commenting,
): Promise<void> {
  console.log(`[ContributionGrid] Processing commenting contribution update for user: ${userId}`);

  try {
    // 기존 그리드 읽기
    const admin = require('../shared/admin').default;
    const db = admin.firestore();
    const docId = `${userId}_${ActivityType.COMMENTING}`;
    const docRef = db.collection('contributionGrids').doc(docId);

    const docSnap = await docRef.get();
    const existingGrid = docSnap.exists ? (docSnap.data() as ContributionGrid) : null;

    // 순수 함수로 업데이트 계산
    const update = calculateCommentingContributionUpdate(userId, commentingData, existingGrid);

    if (update) {
      await applyContributionGridUpdate(update);
      console.log(
        `[ContributionGrid] Successfully processed commenting contribution for user: ${userId}`,
      );
    }
  } catch (error) {
    console.error(
      `[ContributionGrid] Error processing commenting contribution for user ${userId}:`,
      error,
    );
  }
}

// Cloud Function triggers
export const updatePostingContributionGrid = onDocumentCreated(
  'users/{userId}/postings/{postingId}',
  async (event) => {
    const postingData = event.data?.data() as Posting;
    if (!postingData) {
      console.error('[ContributionGrid] No posting data found in event');
      return null;
    }

    const { userId } = event.params;
    if (!userId) {
      console.error('[ContributionGrid] Missing userId in event parameters');
      return null;
    }

    await processPostingContribution(userId, postingData);
    return null;
  },
);

export const updateCommentingContributionGrid = onDocumentCreated(
  'users/{userId}/commentings/{commentingId}',
  async (event) => {
    const commentingData = event.data?.data() as Commenting;
    if (!commentingData) {
      console.error('[ContributionGrid] No commenting data found in event');
      return null;
    }

    const { userId } = event.params;
    if (!userId) {
      console.error('[ContributionGrid] Missing userId in event parameters');
      return null;
    }

    await processCommentingContribution(userId, commentingData);
    return null;
  },
);
