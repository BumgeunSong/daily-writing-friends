import { Timestamp } from "firebase-admin/firestore";
import admin from "../admin";
import { calculateAndUpdateRecoveryStatus } from "../recoveryStatus/updateRecoveryStatus";

// Helper function to convert Date to Asia/Seoul timezone
function toSeoulDate(date: Date): Date {
  const seoulTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return seoulTime;
}

// Helper function to check if a date is a working day (Mon-Fri) in Asia/Seoul timezone
function isWorkingDay(date: Date): boolean {
  const seoulDate = toSeoulDate(date);
  const day = seoulDate.getDay();
  return day >= 1 && day <= 5; // Monday = 1, Friday = 5
}

// Helper function to get previous working day in Asia/Seoul timezone
function getPreviousWorkingDay(date: Date): Date {
  const seoulDate = toSeoulDate(date);
  let prevDate = new Date(seoulDate);
  prevDate.setDate(prevDate.getDate() - 1);
  
  while (!isWorkingDay(prevDate)) {
    prevDate.setDate(prevDate.getDate() - 1);
  }
  
  return prevDate;
}

// Helper function to get current user's recovery status
async function getUserRecoveryStatus(userId: string): Promise<string> {
  console.log(`[RecoveryHandler] Getting recovery status for user: ${userId}`);
  
  const userRef = admin.firestore().collection('users').doc(userId);
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  const recoveryStatus = userData?.recoveryStatus || 'none';
  
  console.log(`[RecoveryHandler] User ${userId} current recovery status: ${recoveryStatus}`);
  return recoveryStatus;
}

export interface PostingRecoveryResult {
  postingCreatedAt: Timestamp;
  isRecovered: boolean;
}

/**
 * Handle recovery logic for posting creation
 * @param authorId - User ID of the post author
 * @param originalCreatedAt - Original post creation timestamp
 * @returns PostingRecoveryResult with adjusted timestamp and recovery flag
 */
export async function handlePostingRecovery(
  authorId: string, 
  originalCreatedAt?: Timestamp
): Promise<PostingRecoveryResult> {
  console.log(`[RecoveryHandler] Starting recovery check for user: ${authorId}`);
  console.log(`[RecoveryHandler] Original createdAt: ${originalCreatedAt ? originalCreatedAt.toDate().toISOString() : 'undefined (using current time)'}`);

  // Convert createdAt to Date for timezone handling (Asia/Seoul)
  const postCreatedAt = originalCreatedAt ? toSeoulDate(originalCreatedAt.toDate()) : toSeoulDate(new Date());
  console.log(`[RecoveryHandler] Post created at (Seoul timezone): ${postCreatedAt.toISOString()}`);

  // Check if this is a working day
  const isWorkingDayToday = isWorkingDay(postCreatedAt);
  console.log(`[RecoveryHandler] Is today a working day? ${isWorkingDayToday}`);

  // Get current user's recovery status
  const currentRecoveryStatus = await getUserRecoveryStatus(authorId);

  let postingCreatedAt = originalCreatedAt || Timestamp.now();
  let isRecovered = false;

  console.log(`[RecoveryHandler] Recovery status check: ${currentRecoveryStatus}`);

  // If current status is 'partial', this is the 2nd post for recovery
  if (currentRecoveryStatus === 'partial') {
    console.log(`[RecoveryHandler] User is in 'partial' status - this will be a recovery post`);
    
    // This is the 2nd post today and we're in recovery mode
    const prevWorkingDay = getPreviousWorkingDay(postCreatedAt);
    console.log(`[RecoveryHandler] Previous working day calculated: ${prevWorkingDay.toISOString()}`);
    
    // Set the posting date to the previous working day for recovery
    postingCreatedAt = Timestamp.fromDate(prevWorkingDay);
    isRecovered = true;
    
    console.log(`[RecoveryHandler] ✅ Recovery post detected for user ${authorId}: posting will be backdated to ${prevWorkingDay.toISOString()}`);
  } else {
    console.log(`[RecoveryHandler] No recovery needed - status is '${currentRecoveryStatus}'`);
  }

  const result = {
    postingCreatedAt,
    isRecovered,
  };

  console.log(`[RecoveryHandler] Recovery result:`, {
    authorId,
    originalTimestamp: originalCreatedAt?.toDate().toISOString(),
    finalTimestamp: postingCreatedAt.toDate().toISOString(),
    isRecovered,
    currentRecoveryStatus
  });

  return result;
}

/**
 * Update user's recovery status after posting creation
 * @param authorId - User ID of the post author
 * @param postCreatedAt - Date when the post was created (Seoul timezone)
 */
export async function updateRecoveryStatusAfterPosting(
  authorId: string, 
  postCreatedAt: Date
): Promise<void> {
  console.log(`[RecoveryHandler] Updating recovery status after posting for user: ${authorId}`);
  console.log(`[RecoveryHandler] Post created at: ${postCreatedAt.toISOString()}`);
  
  try {
    await calculateAndUpdateRecoveryStatus(authorId, postCreatedAt);
    console.log(`[RecoveryHandler] ✅ Successfully updated recovery status for user: ${authorId}`);
  } catch (error) {
    console.error(`[RecoveryHandler] ❌ Error updating recovery status for user ${authorId}:`, error);
    throw error;
  }
}