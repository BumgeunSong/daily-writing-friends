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
  const userRef = admin.firestore().collection('users').doc(userId);
  const userDoc = await userRef.get();
  const userData = userDoc.data();
  return userData?.recoveryStatus || 'none';
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
  // Convert createdAt to Date for timezone handling (Asia/Seoul)
  const postCreatedAt = originalCreatedAt ? toSeoulDate(originalCreatedAt.toDate()) : toSeoulDate(new Date());

  // Get current user's recovery status
  const currentRecoveryStatus = await getUserRecoveryStatus(authorId);

  let postingCreatedAt = originalCreatedAt || Timestamp.now();
  let isRecovered = false;

  // If current status is 'partial', this is the 2nd post for recovery
  if (currentRecoveryStatus === 'partial') {
    // This is the 2nd post today and we're in recovery mode
    const prevWorkingDay = getPreviousWorkingDay(postCreatedAt);
    // Set the posting date to the previous working day for recovery
    postingCreatedAt = Timestamp.fromDate(prevWorkingDay);
    isRecovered = true;
    
    console.log(`Recovery post detected for user ${authorId}: posting will be backdated to ${prevWorkingDay.toISOString()}`);
  }

  return {
    postingCreatedAt,
    isRecovered,
  };
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
  await calculateAndUpdateRecoveryStatus(authorId, postCreatedAt);
}